from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.api.deps import require_super_admin
from src.api.v1.routes.store.products import _IMPORTED_PRODUCTS
from src.db.models.store import Category, Store
from src.db.models.zone import Zone
from src.models.user import ClerkUser

router = APIRouter(prefix="/stores", tags=["stores"])


class StoreZoneSummary(BaseModel):
    id: str
    name: str
    floor: int


class StoreCategorySummary(BaseModel):
    id: str
    name: str


class StoreListItem(BaseModel):
    id: str
    name: str
    description: str
    floor: int
    unit_number: str
    zone: StoreZoneSummary | None = None
    category: StoreCategorySummary | None = None
    admin_email: str | None = None


class StoreCreate(BaseModel):
    name: str
    description: str = ""
    floor: int
    unit_number: str
    zone_id: str
    category_id: str | None = None
    admin_email: str | None = None


class ZoneCreate(BaseModel):
    name: str
    floor: int
    capacity: int


class ZoneListItem(BaseModel):
    id: str
    name: str
    floor: int
    capacity: int


class CategoryCreate(BaseModel):
    name: str
    slug: str


class CategoryListItem(BaseModel):
    id: str
    name: str
    slug: str


class StoreZoneUpdate(BaseModel):
    zone_id: str


@router.get("", response_model=list[StoreListItem])
async def list_stores() -> list[StoreListItem]:
    stores = await Store.all().select_related("zone", "category")
    items: list[StoreListItem] = []

    for store in stores:
        zone = getattr(store, "zone", None)
        category = getattr(store, "category", None)

        # Load the admin user associated with this store
        admin = await store.admins.first() # type: ignore
        admin_email = admin.email if admin else None

        items.append(
            StoreListItem(
                id=str(store.id),
                name=store.name,
                description=store.description,
                floor=store.floor,
                unit_number=store.unit_number,
                zone=(
                    StoreZoneSummary(
                        id=str(zone.id),
                        name=zone.name,
                        floor=zone.floor,
                    )
                    if zone
                    else None
                ),
                category=(
                    StoreCategorySummary(
                        id=str(category.id),
                        name=category.name,
                    )
                    if category
                    else None
                ),
                admin_email=admin_email,
            )
        )

    # Include any in-memory imported stores (from CSV imports)
    imported_by_store: dict[str, list[dict]] = {}
    for p in _IMPORTED_PRODUCTS:
        sid = p.get("import_store_id")
        if not sid:
            continue
        imported_by_store.setdefault(sid, []).append(p)

    for sid, products in imported_by_store.items():
        name = products[0].get("import_store_name") or sid
        items.append(
            StoreListItem(
                id=sid,
                name=name,
                description=f"Imported {len(products)} products",
                floor=0,
                unit_number="",
                zone=None,
                category=None,
                admin_email=None,
            )
        )

    return items


@router.post("", response_model=StoreListItem)
async def create_store(
    data: StoreCreate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> StoreListItem:
    zone = await Zone.get_or_none(id=data.zone_id)
    if not zone:
        raise HTTPException(status_code=400, detail="Zone not found")

    category = None
    if data.category_id:
        category = await Category.get_or_none(id=data.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")

    store = await Store.create(
        name=data.name,
        description=data.description,
        floor=data.floor,
        unit_number=data.unit_number,
        zone=zone,
        category=category,
    )

    if data.admin_email:
        from src.db.models.user import User
        from src.db.models.user import UserRole as DBUserRole

        email_clean = data.admin_email.strip().lower()
        db_user, _ = await User.get_or_create(
            email=email_clean,
            defaults={"clerk_id": f"pending-{email_clean}", "role": DBUserRole.store_admin},
        )
        db_user.role = DBUserRole.store_admin
        db_user.store = store
        await db_user.save()

    return StoreListItem(
        id=str(store.id),
        name=store.name,
        description=store.description,
        floor=store.floor,
        unit_number=store.unit_number,
        zone=StoreZoneSummary(id=str(zone.id), name=zone.name, floor=zone.floor),
        category=(
            StoreCategorySummary(id=str(category.id), name=category.name) if category else None
        ),
        admin_email=data.admin_email,
    )


@router.get("/zones", response_model=list[ZoneListItem])
async def list_zones() -> list[ZoneListItem]:
    zones = await Zone.all()
    return [
        ZoneListItem(id=str(z.id), name=z.name, floor=z.floor, capacity=z.capacity) for z in zones
    ]


@router.post("/zones", response_model=ZoneListItem)
async def create_zone(
    data: ZoneCreate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> ZoneListItem:
    zone = await Zone.create(**data.model_dump())
    return ZoneListItem(
        id=str(zone.id),
        name=zone.name,
        floor=zone.floor,
        capacity=zone.capacity,
    )


@router.get("/categories", response_model=list[CategoryListItem])
async def list_categories() -> list[CategoryListItem]:
    categories = await Category.all()
    return [CategoryListItem(id=str(c.id), name=c.name, slug=c.slug) for c in categories]


@router.post("/categories", response_model=CategoryListItem)
async def create_category(
    data: CategoryCreate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> CategoryListItem:
    existing = await Category.get_or_none(slug=data.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    category = await Category.create(**data.model_dump())
    return CategoryListItem(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
    )


@router.patch("/{store_id}/zone", response_model=StoreListItem)
async def update_store_zone(
    store_id: str,
    data: StoreZoneUpdate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> StoreListItem:
    store = await Store.get_or_none(id=store_id).select_related("category")
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    zone = await Zone.get_or_none(id=data.zone_id)
    if not zone:
        raise HTTPException(status_code=400, detail="Zone not found")

    store.zone = zone
    await store.save()

    category = getattr(store, "category", None)
    return StoreListItem(
        id=str(store.id),
        name=store.name,
        description=store.description,
        floor=store.floor,
        unit_number=store.unit_number,
        zone=StoreZoneSummary(id=str(zone.id), name=zone.name, floor=zone.floor),
        category=(
            StoreCategorySummary(id=str(category.id), name=category.name) if category else None
        ),
    )
