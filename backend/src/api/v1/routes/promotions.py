from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.api.deps import require_super_admin
from src.db.models.promotion import Promotion
from src.db.models.store import Store
from src.models.user import ClerkUser

router = APIRouter(prefix="/promotions", tags=["promotions"])


class PromotionStoreSummary(BaseModel):
    id: str
    name: str


class PromotionResponse(BaseModel):
    id: str
    title: str
    description: str
    discount_pct: float
    starts_at: datetime
    ends_at: datetime
    is_active: bool
    store: PromotionStoreSummary
    created_at: datetime


class PromotionCreate(BaseModel):
    title: str
    description: str = ""
    discount_pct: float
    store_id: str
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class PromotionToggle(BaseModel):
    is_active: bool


def _to_response(p: Promotion) -> PromotionResponse:
    store: Store = p.store  # type: ignore[assignment]
    return PromotionResponse(
        id=str(p.id),
        title=p.title,
        description=p.description,
        discount_pct=float(p.discount_pct),
        starts_at=p.starts_at,
        ends_at=p.ends_at,
        is_active=p.is_active,
        store=PromotionStoreSummary(id=str(store.id), name=store.name),
        created_at=p.created_at,
    )


@router.get("", response_model=list[PromotionResponse])
async def list_promotions() -> list[PromotionResponse]:
    promotions = await Promotion.all().select_related("store").order_by("-created_at")
    return [_to_response(p) for p in promotions]


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    data: PromotionCreate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> PromotionResponse:
    store = await Store.get_or_none(id=data.store_id)
    if not store:
        raise HTTPException(status_code=400, detail="Store not found")

    now = datetime.now(timezone.utc)
    p = await Promotion.create(
        store=store,
        title=data.title,
        description=data.description,
        discount_pct=data.discount_pct,
        starts_at=data.starts_at or now,
        ends_at=data.ends_at or (now + timedelta(days=30)),
        is_active=True,
    )
    await p.fetch_related("store")
    return _to_response(p)


@router.patch("/{promotion_id}", response_model=PromotionResponse)
async def toggle_promotion(
    promotion_id: UUID,
    data: PromotionToggle,
    _admin: ClerkUser = Depends(require_super_admin),
) -> PromotionResponse:
    p = await Promotion.get_or_none(id=promotion_id)
    if not p:
        raise HTTPException(status_code=404, detail="Promotion not found")
    p.is_active = data.is_active
    await p.save()
    await p.fetch_related("store")
    return _to_response(p)


@router.delete("/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promotion(
    promotion_id: UUID,
    _admin: ClerkUser = Depends(require_super_admin),
) -> None:
    p = await Promotion.get_or_none(id=promotion_id)
    if not p:
        raise HTTPException(status_code=404, detail="Promotion not found")
    await p.delete()
