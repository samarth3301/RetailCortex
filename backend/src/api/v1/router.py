from fastapi import APIRouter

from src.api.v1.routes import agent, health, history, notifications, operations, promotions, stores, users
from src.api.v1.routes.store import products

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(products.router)
router.include_router(stores.router)
router.include_router(users.router)
router.include_router(history.router)
router.include_router(operations.router)
router.include_router(notifications.router)
router.include_router(promotions.router)
router.include_router(agent.router)
