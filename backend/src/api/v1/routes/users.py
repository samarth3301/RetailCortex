from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.api.deps import get_current_user, require_super_admin
from src.core.clerk import set_user_public_metadata
from src.db.models.user import User
from src.db.models.user import UserRole as DBUserRole
from src.models.user import ClerkUser, UserRole

router = APIRouter(prefix="/users", tags=["users"])


class RoleUpdate(BaseModel):
    role: UserRole


@router.get("/me", response_model=ClerkUser)
async def get_me(user: ClerkUser = Depends(get_current_user)):
    return user


@router.patch("/{clerk_user_id}/role", response_model=ClerkUser)
async def update_user_role(
    clerk_user_id: str,
    body: RoleUpdate,
    _admin: ClerkUser = Depends(require_super_admin),
) -> ClerkUser:
    db_user = await User.get_or_none(clerk_id=clerk_user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.role = DBUserRole(body.role)
    await db_user.save()

    await set_user_public_metadata(clerk_user_id, {"role": body.role})

    return ClerkUser(
        id=db_user.clerk_id,
        email=db_user.email,
        role=body.role,
    )


@router.get("", response_model=list[ClerkUser])
async def list_users(_admin: ClerkUser = Depends(require_super_admin)) -> list[ClerkUser]:
    users = await User.all().values()
    return [
        ClerkUser(id=user["clerk_id"], email=user["email"], role=user["role"]) for user in users
    ]
