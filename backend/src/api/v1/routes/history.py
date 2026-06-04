from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.deps import get_db_user, require_super_admin
from src.db.models.activity import ActivityEventType as DBEventType
from src.db.models.activity import UserActivity
from src.db.models.user import User
from src.models.activity import (
    ActivityEventType,
    ActivityListResponse,
    ActivityResponse,
    RecordActivityRequest,
)
from src.models.user import ClerkUser

router = APIRouter(prefix="/users", tags=["history"])


def _to_response(row: UserActivity) -> ActivityResponse:
    return ActivityResponse(
        id=row.id,
        event_type=ActivityEventType(row.event_type),
        query=row.query,
        feature=row.feature,
        metadata=row.metadata,
        created_at=row.created_at,
    )


@router.post("/me/history", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def record_activity(
    body: RecordActivityRequest,
    db_user: User = Depends(get_db_user),
):
    row = await UserActivity.create(
        user=db_user,
        event_type=DBEventType(body.event_type),
        query=body.query,
        feature=body.feature,
        metadata=body.metadata,
    )
    return _to_response(row)


@router.get("/me/history", response_model=ActivityListResponse)
async def get_my_history(
    event_type: Optional[ActivityEventType] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db_user: User = Depends(get_db_user),
):
    qs = UserActivity.filter(user=db_user)
    if event_type:
        qs = qs.filter(event_type=DBEventType(event_type))
    total = await qs.count()
    rows = await qs.order_by("-created_at").offset(offset).limit(limit)
    return ActivityListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/me/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_my_history(
    event_type: Optional[ActivityEventType] = Query(None),
    db_user: User = Depends(get_db_user),
):
    qs = UserActivity.filter(user=db_user)
    if event_type:
        qs = qs.filter(event_type=DBEventType(event_type))
    await qs.delete()


@router.delete("/me/history/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_history_item(
    activity_id: str,
    db_user: User = Depends(get_db_user),
):
    row = await UserActivity.get_or_none(id=activity_id, user=db_user)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity item not found")
    await row.delete()


@router.get("/{clerk_user_id}/history", response_model=ActivityListResponse)
async def get_user_history(
    clerk_user_id: str,
    event_type: Optional[ActivityEventType] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: ClerkUser = Depends(require_super_admin),
):
    db_user = await User.get_or_none(clerk_id=clerk_user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    qs = UserActivity.filter(user=db_user)
    if event_type:
        qs = qs.filter(event_type=DBEventType(event_type))
    total = await qs.count()
    rows = await qs.order_by("-created_at").offset(offset).limit(limit)
    return ActivityListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
