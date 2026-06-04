from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.clerk import verify_clerk_token
from src.db.models.user import User
from src.db.models.user import UserRole as DBUserRole
from src.models.user import ClerkUser, UserRole

_bearer = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> ClerkUser:
    try:
        payload = await verify_clerk_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    clerk_id = payload["sub"]
    email = payload.get("email", "")

    db_user = await User.get_or_none(clerk_id=clerk_id)
    if not db_user:
        # Check if there is an onboarded pending user with this email
        db_user = await User.get_or_none(email=email)
        if db_user:
            db_user.clerk_id = clerk_id
            await db_user.save()
        else:
            db_user = await User.create(
                clerk_id=clerk_id,
                email=email,
                role=DBUserRole.user,
            )

    active_role = db_user.role
    # Sync DB role to Clerk public metadata if there is a mismatch
    jwt_role = None
    if "metadata" in payload and isinstance(payload["metadata"], dict):
        jwt_role = payload["metadata"].get("role")

    if jwt_role != db_user.role.value:
        try:
            from src.core.clerk import set_user_public_metadata

            await set_user_public_metadata(clerk_id, {"role": db_user.role.value})
        except Exception as e:
            # Log the error but don't prevent user access since the DB role is valid
            print(f"Error syncing role to Clerk for user {clerk_id}: {e}")

    await db_user.fetch_related("store")
    store_id = str(db_user.store.id) if db_user.store else None
    store_name = db_user.store.name if db_user.store else None

    return ClerkUser(
        id=clerk_id,
        email=email,
        first_name=payload.get("first_name"),
        last_name=payload.get("last_name"),
        image_url=payload.get("image_url"),
        role=UserRole(active_role.value),
        store_id=store_id,
        store_name=store_name,
    )


async def get_db_user(user: ClerkUser = Depends(get_current_user)) -> User:
    db_user = await User.get_or_none(clerk_id=user.id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


def require_role(*roles: UserRole):
    async def _dep(user: ClerkUser = Depends(get_current_user)) -> ClerkUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dep


require_store_admin = require_role(UserRole.store_admin, UserRole.super_admin)
require_super_admin = require_role(UserRole.super_admin)
