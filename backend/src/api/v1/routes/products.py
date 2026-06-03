from fastapi import APIRouter, Depends, Query

from src.api.deps import get_current_user
from src.db.models.product import Product as ProductDB
from src.integrations.elastic import ElasticIntegration
from src.models.product import Product, ProductCreate
from src.models.response import SuccessResponse, ok
from src.models.user import ClerkUser, UserRole

router = APIRouter(prefix="/products", tags=["products"])


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
