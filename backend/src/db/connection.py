from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from src.config import settings


def _prepare_db_url(url: str) -> str:
    # Tortoise/asyncpg fix: replace postgresql:// with postgres://
    url = url.replace("postgresql://", "postgres://", 1)

    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    # Problems with these in asyncpg when passed via Tortoise
    problematic_params = ["sslmode", "channel_binding", "options"]
    for param in problematic_params:
        if param in query:
            query.pop(param)

    new_query = urlencode(query, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


TORTOISE_ORM = {
    "connections": {"default": _prepare_db_url(settings.database_url)},
    "apps": {
        "models": {
            "models": ["src.db.models", "aerich.models"],
            "default_connection": "default",
        }
    },
    "use_tz": True,
}
