from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from src.db.models.congestion import CongestionLevel
from src.db.models.facility import FacilityType, IssueSeverity, IssueStatus


class CongestionEventCreate(BaseModel):
    zone_id: str
    occupancy: int
    level: CongestionLevel


class CongestionEvent(CongestionEventCreate):
    id: str
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacilityIssueCreate(BaseModel):
    zone_id: Optional[str] = None
    title: str
    description: str = ""
    facility_type: FacilityType = FacilityType.other
    severity: IssueSeverity = IssueSeverity.medium


class FacilityIssue(FacilityIssueCreate):
    id: str
    status: IssueStatus
    reported_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
