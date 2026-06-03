from decimal import Decimal
from typing import Optional

from mcp.server.fastmcp import FastMCP

from src.db.models.congestion import CongestionEvent as CongestionDB
from src.db.models.facility import FacilityIssue as FacilityDB, FacilityType
from src.db.models.product import Product as ProductDB
from src.integrations.dynatrace import DynatraceIntegration
from src.integrations.elastic import ElasticIntegration

mcp = FastMCP("RetailCortex Agent")


@mcp.tool()
async def search_products(query: str, max_price: Optional[float] = None):
    """Search for products in the retail catalog. Use for queries like "find shoes under 5000"."""
    filters = {}
    if max_price is not None:
        filters["price_max"] = Decimal(str(max_price))

    results = await ElasticIntegration.search_products(query, filters)

    if not results:
        db_query = ProductDB.filter(name__icontains=query)
        if max_price is not None:
            db_query = db_query.filter(price__lte=Decimal(str(max_price)))
        products = await db_query.all()
        return [
            {"name": p.name, "price": float(p.price), "description": p.description}
            for p in products
        ]

    return results


@mcp.tool()
async def get_store_health():
    """Get a summary of operational health: congestion levels and active facility issues."""
    issues = await FacilityDB.filter(status="open").all()
    latest_congestion = (
        await CongestionDB.all().order_by("-recorded_at").limit(5).values("zone_id", "level")
    )

    return {
        "active_issues_count": len(issues),
        "issues": [
            {"title": i.title, "severity": i.severity, "type": i.facility_type}
            for i in issues
        ],
        "congestion_status": [
            {"zone": str(c["zone_id"]), "level": c["level"]}
            for c in latest_congestion
        ],
    }


@mcp.tool()
async def report_issue(title: str, facility_type: str, description: str = ""):
    """Report a new facility issue (e.g., "The escalator is making a weird noise")."""
    issue = await FacilityDB.create(
        title=title,
        facility_type=FacilityType(facility_type),
        description=description,
        status="open",
    )

    await DynatraceIntegration.report_facility_issue(
        issue_id=str(issue.id),
        facility_type=facility_type,
        severity="medium",
    )

    return {"status": "reported", "issue_id": str(issue.id)}


if __name__ == "__main__":
    mcp.run()
