from fastapi import APIRouter, Depends

from src.api.deps import get_current_user
from src.models.user import ClerkUser

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ClerkUser)
async def get_me(user: ClerkUser = Depends(get_current_user)):
    return user
