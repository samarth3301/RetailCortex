from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from src.api.deps import get_current_user
from src.db.models.product import Product as ProductDB
from src.db.models.store import Store
from src.integrations.elastic import ElasticIntegration
from src.models.product import Product, ProductCreate
from src.models.response import SuccessResponse, ok
from src.models.user import ClerkUser, UserRole

router = APIRouter(prefix="/products", tags=["products"])


class StoreWithProducts(BaseModel):
    store_id: str
    store_name: str
    floor: int
    unit_number: str
    zone_name: str | None = None
    products: list[Product]
    floor_distance: int | None = None


@router.get("/", response_model=SuccessResponse[list[Product]])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: ClerkUser = Depends(get_current_user),
):
    if user.role == UserRole.store_admin:
        if not user.store_id:
            return ok([])
        products = await ProductDB.filter(store_id=user.store_id).offset(skip).limit(limit)
    else:
        products = await ProductDB.all().offset(skip).limit(limit)
    return ok(products)


@router.post("/", response_model=SuccessResponse[Product])
async def create_product(data: ProductCreate):
    product = await ProductDB.create(**data.model_dump())
    await ElasticIntegration.index_product(data.model_dump())
    return ok(product)


@router.get("/search", response_model=SuccessResponse[list[Product]])
async def search_products(q: str):
    products = await ElasticIntegration.search_products(q)
    if not products:
        products = await ProductDB.filter(name__icontains=q).all()
    return ok(products)


@router.get("/search/stores", response_model=SuccessResponse[list[StoreWithProducts]])
async def search_products_by_store(
    q: str,
    floor: int | None = Query(None, description="Current floor for proximity sorting"),
):
    products_by_store: dict[str, list[Product]] = {}

    raw = await ElasticIntegration.search_products(q)
    if raw:
        for doc in raw:
            sid = str(doc.get("store_id", ""))
            if not sid:
                continue
            p = Product(
                id=str(doc.get("id", "")),
                name=doc.get("name", ""),
                description=doc.get("description", ""),
                price=Decimal(str(doc.get("price", 0))),
                in_stock=bool(doc.get("in_stock", True)),
                tags=doc.get("tags") or [],
                metadata=doc.get("metadata") or {},
                category_id=doc.get("category_id"),
            )
            products_by_store.setdefault(sid, []).append(p)
    else:
        db_products = await ProductDB.filter(name__icontains=q).all()
        for p in db_products:
            sid = str(p.store_id) # type: ignore
            products_by_store.setdefault(sid, []).append(Product.model_validate(p))

    if not products_by_store:
        return ok([])

    stores = await Store.filter(id__in=list(products_by_store.keys())).select_related("zone").all()

    results: list[StoreWithProducts] = []
    for store in stores:
        zone = getattr(store, "zone", None)
        sid = str(store.id)
        results.append(
            StoreWithProducts(
                store_id=sid,
                store_name=store.name,
                floor=store.floor,
                unit_number=store.unit_number,
                zone_name=zone.name if zone else None,
                products=products_by_store.get(sid, []),
                floor_distance=abs(store.floor - floor) if floor is not None else None,
            )
        )

    results.sort(
        key=lambda x: (x.floor_distance if x.floor_distance is not None else 999, x.store_name)
    )
    return ok(results)
