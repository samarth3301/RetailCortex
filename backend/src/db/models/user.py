import enum

from tortoise import fields

from src.db.models.base import BaseModel


class UserRole(str, enum.Enum):
    user = "user"
    store_admin = "store_admin"
    super_admin = "super_admin"


class User(BaseModel):
    clerk_id = fields.CharField(max_length=128, unique=True)
    email = fields.CharField(max_length=255, unique=True)
    role = fields.CharEnumField(UserRole, default=UserRole.user)
    store: fields.ForeignKeyRelation = fields.ForeignKeyField(
        "models.Store", related_name="admins", on_delete=fields.SET_NULL, null=True
    ) # type: ignore

    class Meta:
        table = "users"
