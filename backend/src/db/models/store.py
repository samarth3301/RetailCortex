from tortoise import fields

from src.db.models.base import BaseModel


class Category(BaseModel):
    name = fields.CharField(max_length=128)
    slug = fields.CharField(max_length=128, unique=True)

    class Meta:
        table = "categories"


class Store(BaseModel):
    name = fields.CharField(max_length=255)
    description = fields.TextField(default="")
    floor = fields.IntField()
    unit_number = fields.CharField(max_length=32)
    zone: fields.ForeignKeyRelation = fields.ForeignKeyField(
        "models.Zone", related_name="stores", on_delete=fields.CASCADE
    )
    category: fields.ForeignKeyRelation = fields.ForeignKeyField(
        "models.Category", related_name="stores", on_delete=fields.SET_NULL, null=True
    ) # type: ignore

    class Meta:
        table = "stores"
