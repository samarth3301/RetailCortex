from tortoise import fields

from src.db.models.base import BaseModel


class Product(BaseModel):
    name = fields.CharField(max_length=255)
    description = fields.TextField(default="")
    price = fields.DecimalField(max_digits=10, decimal_places=2)
    in_stock = fields.BooleanField(default=True)
    tags = fields.JSONField(default=list)
    metadata = fields.JSONField(default=dict)
    store: fields.ForeignKeyRelation = fields.ForeignKeyField(
        "models.Store", related_name="products", on_delete=fields.CASCADE
    )
    category: fields.ForeignKeyRelation = fields.ForeignKeyField(
        "models.Category", related_name="products", on_delete=fields.SET_NULL, null=True
    )

    class Meta:
        table = "products"
