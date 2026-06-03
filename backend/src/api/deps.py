from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.clerk import verify_clerk_token
from src.models.user import ClerkUser

_bearer = HTTPBearer()


async def get_current_user(
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

    return ClerkUser(
        id=payload["sub"],
        email=payload.get("email", ""),
        first_name=payload.get("first_name"),
        last_name=payload.get("last_name"),
        image_url=payload.get("image_url"),
    )
