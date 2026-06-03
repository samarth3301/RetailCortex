from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str
    description: str = ""
    price: Decimal
    in_stock: bool = True
    tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    category_id: Optional[str] = None


class ProductCreate(ProductBase):
    store_id: str


class Product(ProductBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
