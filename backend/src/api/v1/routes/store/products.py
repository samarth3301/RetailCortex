from __future__ import annotations

import csv
from io import StringIO
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from src.api.deps import get_current_user, require_store_admin
from src.db.models.product import Product as ProductDB
from src.db.models.store import Category as CategoryDB
from src.db.models.user import User as DBUser
from src.integrations.elastic import ElasticIntegration
from src.models.user import ClerkUser, UserRole

router = APIRouter(prefix="/products", tags=["products"])

REQUIRED_FIELDS = ["product_id", "name", "category", "brand", "price", "stock", "image_url"]
TEMPLATE = "product_id,name,category,brand,price,stock,image_url,description\n"

_IMPORTED_PRODUCTS: list[dict[str, Any]] = []
_IMPORT_COUNTER = 0


class CsvPayload(BaseModel):
    csv_content: str = Field(min_length=1)
    store_name: str | None = None


class CsvError(BaseModel):
    row: int
    field: str
    code: str
    message: str


class CsvPreviewRow(BaseModel):
    row: int
    product_id: str | None = None
    name: str | None = None
    category: str | None = None
    brand: str | None = None
    price: float | None = None
    stock: int | None = None
    image_url: str | None = None
    description: str | None = None
    status: str


class CsvValidationResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: list[CsvError]
    preview: list[CsvPreviewRow]


class ImportResponse(BaseModel):
    imported_count: int
    failed_count: int
    inventory_created: int
    categories_created: int
    search_index_updated: bool
    errors: list[CsvError]


class StoreSummaryResponse(BaseModel):
    total_products: int
    in_stock: int
    out_of_stock: int
    categories: int
    low_stock: int


def _normalize_row(row: dict[str, str | None]) -> dict[str, str]:
    return {key.strip(): (value or "").strip() for key, value in row.items() if key is not None}


def _parse_csv(csv_content: str) -> tuple[list[dict[str, Any]], list[CsvError]]:
    if not csv_content.strip():
        raise HTTPException(status_code=400, detail="CSV content is empty")

    reader = csv.DictReader(StringIO(csv_content))
    headers = [header.strip() for header in (reader.fieldnames or [])]
    missing_headers = [field for field in REQUIRED_FIELDS if field not in headers]
    if missing_headers:
        return [], [
            CsvError(
                row=1,
                field=field,
                code="missing_header",
                message=f"Missing required column: {field}",
            )
            for field in missing_headers
        ]

    rows: list[dict[str, Any]] = []
    errors: list[CsvError] = []
    seen_ids: set[str] = set()

    for row_number, raw_row in enumerate(reader, start=2):
        row = _normalize_row(raw_row)
        row_errors: list[CsvError] = []
        product_id = row.get("product_id", "")
        name = row.get("name", "")
        category = row.get("category", "")
        brand = row.get("brand", "")
        image_url = row.get("image_url", "")
        description = row.get("description", "")

        if not product_id:
            row_errors.append(
                CsvError(
                    row=row_number,
                    field="product_id",
                    code="required",
                    message="Product ID missing",
                )
            )
        elif product_id in seen_ids:
            row_errors.append(
                CsvError(
                    row=row_number,
                    field="product_id",
                    code="duplicate",
                    message="Duplicate Product ID",
                )
            )
        else:
            seen_ids.add(product_id)

        if not name:
            row_errors.append(
                CsvError(
                    row=row_number, field="name", code="required", message="Product Name missing"
                )
            )
        if not category:
            row_errors.append(
                CsvError(
                    row=row_number, field="category", code="required", message="Category missing"
                )
            )
        if not brand:
            row_errors.append(
                CsvError(row=row_number, field="brand", code="required", message="Brand missing")
            )
        if not image_url:
            row_errors.append(
                CsvError(
                    row=row_number, field="image_url", code="required", message="Image URL missing"
                )
            )

        try:
            price = float(row.get("price", ""))
            if price < 0:
                raise ValueError
        except ValueError:
            row_errors.append(
                CsvError(row=row_number, field="price", code="invalid", message="Invalid price")
            )
            price = None

        try:
            stock = int(row.get("stock", ""))
            if stock < 0:
                raise ValueError
        except ValueError:
            row_errors.append(
                CsvError(
                    row=row_number, field="stock", code="invalid", message="Invalid stock quantity"
                )
            )
            stock = None

        rows.append(
            {
                "row": row_number,
                "product_id": product_id or None,
                "name": name or None,
                "category": category or None,
                "brand": brand or None,
                "price": price,
                "stock": stock,
                "image_url": image_url or None,
                "description": description or None,
                "status": "valid" if not row_errors else "invalid",
            }
        )
        errors.extend(row_errors)

    return rows, errors


@router.get("/template", response_class=PlainTextResponse)
async def download_template() -> str:
    return TEMPLATE


@router.post("/validate-csv", response_model=CsvValidationResponse)
async def validate_csv(
    payload: CsvPayload,
    _user: ClerkUser = Depends(require_store_admin),
) -> CsvValidationResponse:
    rows, errors = _parse_csv(payload.csv_content)
    valid_rows = [row for row in rows if row["status"] == "valid"]
    return CsvValidationResponse(
        total_rows=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=len(rows) - len(valid_rows),
        errors=errors,
        preview=[CsvPreviewRow(**row) for row in rows[:10]],
    )


@router.post("/upload-csv", response_model=CsvValidationResponse)
async def upload_csv(
    payload: CsvPayload,
    user: ClerkUser = Depends(require_store_admin),
) -> CsvValidationResponse:
    return await validate_csv(payload, user)


@router.post("/import", response_model=ImportResponse)
async def import_products(
    payload: CsvPayload,
    user: ClerkUser = Depends(require_store_admin),
) -> ImportResponse:
    db_user = await DBUser.get(clerk_id=user.id).select_related("store")
    store = db_user.store
    if not store:
        raise HTTPException(
            status_code=400,
            detail="No store layout has been assigned to your admin account yet.",
        )

    rows, errors = _parse_csv(payload.csv_content)
    valid_rows = [row for row in rows if row["status"] == "valid"]

    categories_created = 0
    imported_count = 0

    # Write each product to DB
    for row in valid_rows:
        cat_name = row["category"]
        cat_slug = cat_name.lower().replace(" ", "-")
        category, created = await CategoryDB.get_or_create(
            slug=cat_slug,
            defaults={"name": cat_name},
        )
        if created:
            categories_created += 1

        # Delete existing product with same SKU code for this store (idempotent import)
        await ProductDB.filter(store=store, name=row["name"]).delete()

        p_db = await ProductDB.create(
            name=row["name"],
            description=row["description"] or "",
            price=row["price"],
            in_stock=row["stock"] > 0,
            store=store,
            category=category,
            metadata={
                "sku": row["product_id"],
                "brand": row["brand"],
                "stock": row["stock"],
                "image_url": row["image_url"],
            },
            tags=[row["brand"]],
        )

        # Trigger search indexing
        await ElasticIntegration.index_product(
            {
                "id": str(p_db.id),
                "name": p_db.name,
                "description": p_db.description,
                "price": float(p_db.price),
                "in_stock": p_db.in_stock,
                "store_id": str(store.id),
                "category_id": str(category.id),
                "tags": p_db.tags,
            }
        )

        imported_count += 1

    # Still update the in-memory counter/list for backup listing in general summary if needed
    global _IMPORT_COUNTER
    _IMPORT_COUNTER += 1
    import_id = f"import-{_IMPORT_COUNTER}"
    import_name = store.name

    for row in valid_rows:
        _IMPORTED_PRODUCTS.append(
            {
                "product_id": row["product_id"],
                "name": row["name"],
                "category": row["category"],
                "brand": row["brand"],
                "price": row["price"],
                "stock": row["stock"],
                "image_url": row["image_url"],
                "description": row["description"],
                "import_store_id": import_id,
                "import_store_name": import_name,
            }
        )

    return ImportResponse(
        imported_count=imported_count,
        failed_count=len(rows) - len(valid_rows),
        inventory_created=imported_count,
        categories_created=categories_created,
        search_index_updated=bool(valid_rows),
        errors=errors,
    )


@router.get("/summary", response_model=StoreSummaryResponse)
async def summary(
    user: ClerkUser = Depends(get_current_user),
) -> StoreSummaryResponse:
    if user.role == UserRole.store_admin:
        if not user.store_id:
            return StoreSummaryResponse(
                total_products=0,
                in_stock=0,
                out_of_stock=0,
                categories=0,
                low_stock=0,
            )
        products = await ProductDB.filter(store_id=user.store_id).select_related("category")
    else:
        products = await ProductDB.all().select_related("category")

    categories_set = {p.category.id for p in products if p.category}

    in_stock_count = 0
    out_of_stock_count = 0
    low_stock_count = 0

    for p in products:
        stock = p.metadata.get("stock", 0) if isinstance(p.metadata, dict) else 0
        try:
            stock_int = int(stock)
        except (ValueError, TypeError):
            stock_int = 0

        if stock_int > 0:
            in_stock_count += 1
        else:
            out_of_stock_count += 1

        if 0 < stock_int <= 5:
            low_stock_count += 1

    return StoreSummaryResponse(
        total_products=len(products),
        in_stock=in_stock_count,
        out_of_stock=out_of_stock_count,
        categories=len(categories_set),
        low_stock=low_stock_count,
    )
