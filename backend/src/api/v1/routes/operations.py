from fastapi import APIRouter, Query

from src.db.models.congestion import CongestionEvent as CongestionDB
from src.db.models.facility import FacilityIssue as FacilityDB
from src.integrations.dynatrace import DynatraceIntegration
from src.models.operations import (
    CongestionEvent,
    CongestionEventCreate,
    FacilityIssue,
    FacilityIssueCreate,
)
from src.models.response import SuccessResponse, ok

router = APIRouter(prefix="/operations", tags=["operations"])


@router.post("/congestion", response_model=SuccessResponse[CongestionEvent])
async def record_congestion(data: CongestionEventCreate):
    event = await CongestionDB.create(**data.model_dump())
    await DynatraceIntegration.report_congestion(
        zone_id=data.zone_id,
        occupancy=data.occupancy,
        level=data.level,
    )
    return ok(event)


@router.post("/facility-issue", response_model=SuccessResponse[FacilityIssue])
async def report_facility_issue(data: FacilityIssueCreate):
    issue = await FacilityDB.create(**data.model_dump())
    await DynatraceIntegration.report_facility_issue(
        issue_id=str(issue.id),
        facility_type=data.facility_type,
        severity=data.severity,
    )
    return ok(issue)


@router.get("/facility-issues", response_model=SuccessResponse[list[FacilityIssue]])
async def list_facility_issues(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    issues = await FacilityDB.all().offset(skip).limit(limit)
    return ok(issues)
