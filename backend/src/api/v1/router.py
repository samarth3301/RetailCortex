from fastapi import APIRouter

from src.api.v1.routes import health, operations, products, users

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(users.router)
router.include_router(products.router)
router.include_router(operations.router)
