from datetime import datetime

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


class CongestionZoneSummary(BaseModel):
    zone_id: str
    zone_name: str
    floor: int
    capacity: int
    occupancy: int
    occupancy_pct: int
    level: str


class FacilityIssueCreate(BaseModel):
    zone_id: str | None = None
    title: str
    description: str = ""
    facility_type: FacilityType = FacilityType.other
    severity: IssueSeverity = IssueSeverity.medium


class FacilityIssue(FacilityIssueCreate):
    id: str
    status: IssueStatus
    reported_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
