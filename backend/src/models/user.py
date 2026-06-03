import enum
from typing import Optional

from pydantic import BaseModel


class UserRole(str, enum.Enum):
    user = "user"
    store_admin = "store_admin"
    super_admin = "super_admin"


class ClerkUser(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    role: UserRole = UserRole.user
