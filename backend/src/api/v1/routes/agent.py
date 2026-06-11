import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from google.genai.types import Type
from pydantic import BaseModel

from src.agent.server import get_live_congestion, get_store_health, report_issue, search_products
from src.api.deps import get_current_user
from src.config import settings
from src.models.user import ClerkUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])

GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_INSTRUCTION = """You are RetailCortex AI — an intelligent operations assistant embedded in the RetailCortex mall management dashboard.

Your users are mall operators, super admins, and store managers — not shoppers.

## Your capabilities
- search_products: Query the product catalog across all tenant stores (inventory lookup, stock checks, price queries)
- get_live_congestion: Real-time crowd density per zone from Dynatrace metrics + database events
- get_store_health: Operational health snapshot — open facility issues, Dynatrace problems, congestion overview
- report_issue: Log a new facility issue (escalator, HVAC, lighting, etc.) to the system and Dynatrace

## Rules
- Always use tools to fetch live data — never hallucinate stock levels, occupancy, or issue counts
- Be concise and precise — operators need actionable data fast, not prose
- Format responses with clear structure:
  * Use bullet points for lists of items
  * Bold key metrics (wrap in **)
  * Emoji sparingly for severity signals (🔴 critical, 🟡 medium, 🟢 low/ok)
- For product searches: show name, price, stock status, and store name
- For congestion: show zone name, occupancy %, and density level
- For health checks: lead with the count of open issues, then list critical ones first
- For issue reports: confirm with issue ID and severity
- If a tool returns empty data, say so clearly and suggest what the operator might check next
- Scope: You operate within this mall's data only. Don't speculate about external market data."""

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
        try:
            response = await client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=config,
            )
        except ClientError as exc:
            if exc.code == 429:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service rate limit reached. Please wait a moment and try again.",
                )
            logger.error("Gemini API error: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {exc.message}",
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
