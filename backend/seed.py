"""
RetailCortex seed script — run from backend/ directory:
    uv run python seed.py
"""
import asyncio
from datetime import datetime, timedelta, timezone

from tortoise import Tortoise

from src.db.connection import TORTOISE_ORM
from src.db.models.congestion import CongestionEvent, CongestionLevel
from src.db.models.notification import Notification
from src.db.models.product import Product
from src.db.models.promotion import Promotion
from src.db.models.store import Category, Store
from src.db.models.zone import Zone
from src.integrations.elastic import ElasticIntegration


# ── helpers ──────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def days(n: int) -> timedelta:
    return timedelta(days=n)


# ── seed data ─────────────────────────────────────────────────────────────────

ZONES = [
    {"name": "North Wing",      "floor": 1, "capacity": 800},
    {"name": "South Atrium",    "floor": 1, "capacity": 1200},
    {"name": "East Gallery",    "floor": 2, "capacity": 600},
    {"name": "West Promenade",  "floor": 2, "capacity": 700},
    {"name": "Food Court",      "floor": 3, "capacity": 500},
    {"name": "Sky Terrace",     "floor": 4, "capacity": 300},
]

CATEGORIES = [
    {"name": "Footwear",     "slug": "footwear"},
    {"name": "Clothing",     "slug": "clothing"},
    {"name": "Lifestyle",    "slug": "lifestyle"},
    {"name": "Electronics",  "slug": "electronics"},
    {"name": "Sports",       "slug": "sports"},
    {"name": "F&B",          "slug": "fnb"},
]

STORES = [
    {
        "name": "Stride Republic",
        "description": "Premium footwear for every lifestyle.",
        "floor": 1,
        "unit_number": "A-01",
        "zone": "North Wing",
        "category": "Footwear",
        "admin_email": "stride@retailcortex.dev",
    },
    {
        "name": "Urban Thread",
        "description": "Contemporary fashion for urban living.",
        "floor": 1,
        "unit_number": "A-04",
        "zone": "South Atrium",
        "category": "Clothing",
        "admin_email": "urban@retailcortex.dev",
    },
    {
        "name": "TechVault",
        "description": "Consumer electronics and smart accessories.",
        "floor": 2,
        "unit_number": "B-11",
        "zone": "East Gallery",
        "category": "Electronics",
        "admin_email": "techvault@retailcortex.dev",
    },
    {
        "name": "ActiveEdge",
        "description": "Performance sportswear and gear.",
        "floor": 2,
        "unit_number": "B-07",
        "zone": "West Promenade",
        "category": "Sports",
        "admin_email": "activeedge@retailcortex.dev",
    },
    {
        "name": "Casa Luxe",
        "description": "Home décor and lifestyle essentials.",
        "floor": 1,
        "unit_number": "A-09",
        "zone": "South Atrium",
        "category": "Lifestyle",
        "admin_email": "casa@retailcortex.dev",
    },
    {
        "name": "Brew & Bites",
        "description": "Specialty coffee, pastries, and quick bites.",
        "floor": 3,
        "unit_number": "C-02",
        "zone": "Food Court",
        "category": "F&B",
        "admin_email": None,
    },
]

PRODUCTS_BY_STORE = {
    "Stride Republic": [
        {"name": "AirFlex Pro Running Shoe",   "price": 129.99, "tags": ["running", "nike", "pro"], "in_stock": True,  "stock": 24},
        {"name": "Urban Slip-On",               "price": 59.99,  "tags": ["casual", "slip-on"],      "in_stock": True,  "stock": 40},
        {"name": "Trail Blazer Hiking Boot",    "price": 174.99, "tags": ["hiking", "boot", "trail"],"in_stock": True,  "stock": 12},
        {"name": "Classic Court Low",           "price": 79.99,  "tags": ["court", "classic"],       "in_stock": True,  "stock": 5},
        {"name": "Kids SpeedStep",              "price": 44.99,  "tags": ["kids", "running"],        "in_stock": False, "stock": 0},
        {"name": "SandStride Summer Sandal",    "price": 39.99,  "tags": ["sandal", "summer"],       "in_stock": True,  "stock": 30},
        {"name": "ChronoRun Elite",             "price": 199.99, "tags": ["running", "elite"],       "in_stock": True,  "stock": 8},
    ],
    "Urban Thread": [
        {"name": "Merino Slim-Fit Shirt",       "price": 69.99,  "tags": ["shirt", "merino", "slim"],"in_stock": True,  "stock": 35},
        {"name": "Linen Jogger Pants",          "price": 54.99,  "tags": ["pants", "linen", "jogger"],"in_stock": True, "stock": 22},
        {"name": "Oversized Graphic Tee",       "price": 34.99,  "tags": ["tee", "graphic"],         "in_stock": True,  "stock": 60},
        {"name": "Tailored Blazer – Navy",      "price": 149.99, "tags": ["blazer", "navy", "formal"],"in_stock": True, "stock": 10},
        {"name": "Cropped Denim Jacket",        "price": 89.99,  "tags": ["denim", "jacket"],        "in_stock": False, "stock": 0},
        {"name": "Ribbed Knit Sweater",         "price": 74.99,  "tags": ["sweater", "knit"],        "in_stock": True,  "stock": 3},
        {"name": "Chino Shorts – Khaki",        "price": 44.99,  "tags": ["shorts", "chino"],        "in_stock": True,  "stock": 18},
    ],
    "TechVault": [
        {"name": "ProBuds X Wireless Earbuds",  "price": 149.99, "tags": ["earbuds", "wireless", "audio"],"in_stock": True, "stock": 20},
        {"name": "SmartCharge 65W GaN Adapter", "price": 49.99,  "tags": ["charger", "gan", "usb-c"],     "in_stock": True, "stock": 45},
        {"name": "UltraSlim Portable Monitor",  "price": 299.99, "tags": ["monitor", "portable"],         "in_stock": True, "stock": 6},
        {"name": "MechBoard TKL Keyboard",      "price": 119.99, "tags": ["keyboard", "mechanical"],      "in_stock": False,"stock": 0},
        {"name": "AnchorCam 4K Webcam",         "price": 89.99,  "tags": ["webcam", "4k"],                "in_stock": True, "stock": 15},
        {"name": "PowerBank Ultra 20K",         "price": 59.99,  "tags": ["powerbank", "portable"],       "in_stock": True, "stock": 28},
        {"name": "SmartWatch Series 3",         "price": 249.99, "tags": ["smartwatch", "wearable"],      "in_stock": True, "stock": 2},
    ],
    "ActiveEdge": [
        {"name": "CoreFit Compression Tights",  "price": 64.99,  "tags": ["compression", "tights", "running"],"in_stock": True,  "stock": 30},
        {"name": "TrailPack 22L Backpack",      "price": 89.99,  "tags": ["backpack", "hiking"],              "in_stock": True,  "stock": 14},
        {"name": "Hyper Sprint Shorts",         "price": 44.99,  "tags": ["shorts", "sprint", "performance"], "in_stock": True,  "stock": 25},
        {"name": "Foam Roller Pro",             "price": 34.99,  "tags": ["recovery", "foam roller"],         "in_stock": True,  "stock": 40},
        {"name": "Resistance Band Set",         "price": 24.99,  "tags": ["resistance", "training"],          "in_stock": True,  "stock": 55},
        {"name": "AeroFit Sports Bra",          "price": 54.99,  "tags": ["sports bra", "women"],             "in_stock": False, "stock": 0},
        {"name": "VO2 Hydration Vest",          "price": 109.99, "tags": ["hydration", "vest", "running"],    "in_stock": True,  "stock": 7},
    ],
    "Casa Luxe": [
        {"name": "Linen Throw Blanket – Ivory", "price": 79.99,  "tags": ["blanket", "linen", "home"],   "in_stock": True,  "stock": 20},
        {"name": "Scented Soy Candle Set",      "price": 39.99,  "tags": ["candle", "scented", "gift"],  "in_stock": True,  "stock": 50},
        {"name": "Ceramic Pour-Over Set",       "price": 64.99,  "tags": ["coffee", "ceramic", "pour-over"],"in_stock": True,"stock": 12},
        {"name": "Bamboo Desk Organiser",       "price": 44.99,  "tags": ["desk", "organiser", "bamboo"],"in_stock": True,  "stock": 18},
        {"name": "Linen Duvet Cover – King",    "price": 129.99, "tags": ["duvet", "linen", "bedding"],  "in_stock": False, "stock": 0},
        {"name": "Handwoven Seagrass Basket",   "price": 54.99,  "tags": ["basket", "storage", "decor"], "in_stock": True,  "stock": 9},
    ],
    "Brew & Bites": [
        {"name": "Single-Origin Cold Brew",     "price": 7.50,   "tags": ["coffee", "cold brew"],        "in_stock": True,  "stock": 100},
        {"name": "Almond Croissant",            "price": 4.50,   "tags": ["pastry", "bakery"],           "in_stock": True,  "stock": 30},
        {"name": "Signature Espresso Blend",    "price": 18.99,  "tags": ["coffee", "beans"],            "in_stock": True,  "stock": 25},
        {"name": "Acai Power Bowl",             "price": 12.99,  "tags": ["healthy", "acai", "bowl"],    "in_stock": False, "stock": 0},
    ],
}

PROMOTIONS = [
    {
        "store": "Stride Republic",
        "title": "Summer Sole Sale",
        "description": "Beat the heat with our biggest footwear discount of the year.",
        "discount_pct": 20,
        "starts_at": now_utc() - days(2),
        "ends_at": now_utc() + days(14),
        "is_active": True,
    },
    {
        "store": "Urban Thread",
        "title": "New Arrivals Launch",
        "description": "Fresh drops from our SS collection — first 3 days only.",
        "discount_pct": 15,
        "starts_at": now_utc(),
        "ends_at": now_utc() + days(3),
        "is_active": True,
    },
    {
        "store": "TechVault",
        "title": "Tech Tuesday Flash",
        "description": "One-day blowout on accessories and peripherals.",
        "discount_pct": 25,
        "starts_at": now_utc() + days(1),
        "ends_at": now_utc() + days(2),
        "is_active": True,
    },
    {
        "store": "ActiveEdge",
        "title": "Race Season Kickoff",
        "description": "Gear up for summer races — all running kit discounted.",
        "discount_pct": 18,
        "starts_at": now_utc() - days(5),
        "ends_at": now_utc() + days(10),
        "is_active": True,
    },
    {
        "store": "Casa Luxe",
        "title": "Home Refresh Weekend",
        "description": "Refresh your space with our curated home essentials selection.",
        "discount_pct": 10,
        "starts_at": now_utc() - days(10),
        "ends_at": now_utc() - days(1),
        "is_active": False,
    },
]

CONGESTION_EVENTS = [
    {"zone": "North Wing",     "occupancy": 320,  "level": CongestionLevel.medium},
    {"zone": "South Atrium",   "occupancy": 980,  "level": CongestionLevel.high},
    {"zone": "East Gallery",   "occupancy": 120,  "level": CongestionLevel.low},
    {"zone": "West Promenade", "occupancy": 450,  "level": CongestionLevel.medium},
    {"zone": "Food Court",     "occupancy": 490,  "level": CongestionLevel.critical},
    {"zone": "Sky Terrace",    "occupancy": 60,   "level": CongestionLevel.low},
]


async def seed():
    await Tortoise.init(config=TORTOISE_ORM)

    print("── Zones ──")
    zone_map: dict[str, Zone] = {}
    for z in ZONES:
        obj, created = await Zone.get_or_create(name=z["name"], defaults={"floor": z["floor"], "capacity": z["capacity"]})
        zone_map[obj.name] = obj
        print(f"  {'[+]' if created else '[=]'} {obj.name} (floor {obj.floor}, cap {obj.capacity})")

    print("\n── Categories ──")
    cat_map: dict[str, Category] = {}
    for c in CATEGORIES:
        obj, created = await Category.get_or_create(slug=c["slug"], defaults={"name": c["name"]})
        cat_map[obj.name] = obj
        print(f"  {'[+]' if created else '[=]'} {obj.name} /{obj.slug}")

    print("\n── Stores ──")
    store_map: dict[str, Store] = {}
    for s in STORES:
        zone = zone_map[s["zone"]]
        cat = cat_map.get(s["category"])
        obj, created = await Store.get_or_create(
            name=s["name"],
            defaults={
                "description": s["description"],
                "floor": s["floor"],
                "unit_number": s["unit_number"],
                "zone_id": zone.pk,
                "category_id": cat.pk if cat else None,
            },
        )
        store_map[obj.name] = obj
        print(f"  {'[+]' if created else '[=]'} {obj.name} @ {s['zone']} unit {s['unit_number']}")

    print("\n── Products ──")
    total_products = 0
    elastic_docs = []
    for store_name, products in PRODUCTS_BY_STORE.items():
        store = store_map.get(store_name)
        if not store:
            continue
        for p in products:
            cat_name = next((s["category"] for s in STORES if s["name"] == store_name), None)
            cat = cat_map.get(cat_name) if cat_name else None
            obj, created = await Product.get_or_create(
                name=p["name"],
                store_id=store.pk,
                defaults={
                    "price": p["price"],
                    "in_stock": p["in_stock"],
                    "tags": p["tags"],
                    "category_id": cat.pk if cat else None,
                    "metadata": {"stock": p.get("stock", 0)},
                },
            )
            if created:
                total_products += 1
            elastic_docs.append({
                "id": str(obj.pk),
                "name": obj.name,
                "description": "",
                "tags": p["tags"],
                "price": float(p["price"]),
                "store_id": str(store.pk),
                "in_stock": p["in_stock"],
            })
    print(f"  [+] {total_products} products inserted")

    print("\n── Elastic Index ──")
    indexed = await ElasticIntegration.bulk_index_products(elastic_docs)
    print(f"  [+] {indexed}/{len(elastic_docs)} docs indexed")

    print("\n── Promotions ──")
    for promo in PROMOTIONS:
        store = store_map.get(promo["store"])
        if not store:
            continue
        obj, created = await Promotion.get_or_create(
            title=promo["title"],
            store_id=store.pk,
            defaults={
                "description": promo["description"],
                "discount_pct": promo["discount_pct"],
                "starts_at": promo["starts_at"],
                "ends_at": promo["ends_at"],
                "is_active": promo["is_active"],
            },
        )
        print(f"  {'[+]' if created else '[=]'} {obj.title} @ {promo['store']} ({promo['discount_pct']}% off)")

    print("\n── Congestion Events ──")
    for evt in CONGESTION_EVENTS:
        zone = zone_map.get(evt["zone"])
        if not zone:
            continue
        obj = await CongestionEvent.create(
            zone_id=zone.pk,
            occupancy=evt["occupancy"],
            level=evt["level"],
        )
        pct = round((evt["occupancy"] / zone.capacity) * 100)
        print(f"  [+] {zone.name}: {evt['occupancy']}/{zone.capacity} ({pct}%) — {evt['level']}")

    print("\n── Notifications ──")
    notif_data = [
        {"title": "New store onboarded", "body": "Brew & Bites has been registered in the Food Court zone."},
        {"title": "Campaign activated", "body": "Summer Sole Sale is now live at Stride Republic (20% off)."},
        {"title": "High congestion alert", "body": "Food Court zone is at critical capacity (490/500 pax)."},
        {"title": "Low stock alert", "body": "SmartWatch Series 3 at TechVault has only 2 units remaining."},
        {"title": "Campaign scheduled", "body": "Tech Tuesday Flash goes live tomorrow at TechVault (25% off)."},
    ]
    for n in notif_data:
        obj = await Notification.create(title=n["title"], body=n["body"], user_id=None)
        print(f"  [+] {obj.title}")

    await Tortoise.close_connections()
    print("\n✓ Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
