import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from google import genai
from google.genai import types
from google.genai.types import Type
from pydantic import BaseModel

from src.agent.server import get_live_congestion, get_store_health, report_issue, search_products
from src.api.deps import get_current_user
from src.config import settings
from src.models.user import ClerkUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])

GEMINI_MODEL = "gemini-2.0-flash-001"

SYSTEM_INSTRUCTION = """You are the RetailCortex AI assistant for a smart mall operations platform.
You help shoppers find products and get live mall status.

Rules:
- Use tools to fetch live data — never guess prices, stock, or congestion
- Be concise — this is a mobile app, keep responses short and scannable
- Search results: list top 3-5 with price and store
- Congestion: clear density label per zone (low/moderate/high/critical)
- Facility reports: confirm filed and give issue ID"""

_TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_products",
        description=(
            "Semantic search across the retail product catalog. "
            "Use for: 'find running shoes', 'cheap sunglasses under 50', 'Nike near me'."
        ),
        parameters=types.Schema(
            type=Type.OBJECT,
            properties={
                "query": types.Schema(type=Type.STRING, description="The search query"),
                "max_price": types.Schema(type=Type.NUMBER, description="Optional max price filter"),
                "store_id": types.Schema(type=Type.STRING, description="Optional store UUID"),
            },
            required=["query"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_live_congestion",
        description=(
            "Real-time crowd density from Dynatrace + database. "
            "Use for: 'is the food court busy?', 'live crowd map', 'where to avoid?'."
        ),
        parameters=types.Schema(
            type=Type.OBJECT,
            properties={
                "zone_name": types.Schema(
                    type=Type.STRING, description="Optional zone name filter (e.g. 'Food Court')"
                ),
            },
        ),
    ),
    types.FunctionDeclaration(
        name="get_store_health",
        description=(
            "Operational health summary: open issues, Dynatrace problems, congestion overview. "
            "Use for: 'how is the mall?', 'any problems?', 'facility status'."
        ),
        parameters=types.Schema(type=Type.OBJECT, properties={}),
    ),
    types.FunctionDeclaration(
        name="report_issue",
        description=(
            "Report a facility issue. "
            "Use for: 'escalator broken', 'AC out in Wing B'. "
            "facility_type: elevator, escalator, hvac, lighting, plumbing, security, other. "
            "severity: low, medium, high, critical."
        ),
        parameters=types.Schema(
            type=Type.OBJECT,
            properties={
                "title": types.Schema(type=Type.STRING),
                "facility_type": types.Schema(type=Type.STRING),
                "description": types.Schema(type=Type.STRING),
                "severity": types.Schema(
                    type=Type.STRING,
                    enum=["low", "medium", "high", "critical"],
                ),
            },
            required=["title", "facility_type"],
        ),
    ),
]

_TOOL_FNS: dict[str, Any] = {
    "search_products": search_products,
    "get_live_congestion": get_live_congestion,
    "get_store_health": get_store_health,
    "report_issue": report_issue,
}


def _get_client() -> genai.Client:
    if not settings.google_cloud_project:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI agent not configured (missing GOOGLE_CLOUD_PROJECT)",
        )
    return genai.Client(
        vertexai=True,
        project=settings.google_cloud_project,
        location=settings.google_cloud_location,
    )


async def _execute_tool(name: str, args: dict[str, Any]) -> Any:
    fn = _TOOL_FNS.get(name)
    if fn is None:
        raise ValueError(f"Unknown tool: {name}")
    return await fn(**args)


class AgentQueryRequest(BaseModel):
    query: str


class AgentQueryResponse(BaseModel):
    answer: str
    tool_used: str | None = None
    tool_result: Any = None


@router.post("/query", response_model=AgentQueryResponse)
async def agent_query(
    body: AgentQueryRequest,
    _user: ClerkUser = Depends(get_current_user),
):
    client = _get_client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=[types.Tool(function_declarations=_TOOL_DECLARATIONS)],  # type: ignore[arg-type]
    )

    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part.from_text(text=body.query)])
    ]

    tool_used: str | None = None
    tool_result: Any = None

    for _ in range(3):  # max 3 agentic turns
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=config,
        )

        candidates = response.candidates or []
        if not candidates or not candidates[0].content:
            break
        parts = candidates[0].content.parts or []

        # Find first function call part
        fn_call = next((p.function_call for p in parts if p.function_call), None)

        if fn_call is None:
            text = "".join(p.text for p in parts if p.text)
            return AgentQueryResponse(
                answer=text,
                tool_used=tool_used,
                tool_result=tool_result,
            )

        fn_name: str = fn_call.name or ""  # type: ignore[assignment]
        fn_args: dict[str, Any] = dict(fn_call.args) if fn_call.args else {}  # type: ignore[arg-type]
        tool_used = fn_name

        try:
            tool_result = await _execute_tool(fn_name, fn_args)
        except Exception as exc:
            logger.error("Tool %s failed: %s", fn_name, exc)
            tool_result = {"error": str(exc)}

        serialized = json.loads(json.dumps(tool_result, default=str))
        contents.append(types.Content(role="model", parts=parts))
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": serialized},
                    )
                ],
            )
        )

    return AgentQueryResponse(
        answer="I couldn't complete that request.",
        tool_used=tool_used,
        tool_result=tool_result,
    )
