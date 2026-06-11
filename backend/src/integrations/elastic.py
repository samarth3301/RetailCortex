import logging
from typing import Any

from elasticsearch import AsyncElasticsearch, NotFoundError

from src.config import settings

logger = logging.getLogger(__name__)

_client: AsyncElasticsearch | None = None

INDEX_MAPPINGS = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "english"},
            "description": {"type": "text", "analyzer": "english"},
            "tags": {"type": "text", "analyzer": "english"},
            "price": {"type": "float"},
            "store_id": {"type": "keyword"},
            "in_stock": {"type": "boolean"},
        }
    }
}


def _client_or_none() -> AsyncElasticsearch | None:
    if not settings.elastic_cloud_id or not settings.elastic_api_key:
        return None
    global _client
    if _client is None:
        _client = AsyncElasticsearch(
            hosts=[settings.elastic_cloud_id],
            api_key=settings.elastic_api_key,
        )
    return _client


async def _ensure_index(client: AsyncElasticsearch) -> None:
    try:
        await client.indices.get(index=settings.elastic_index)
    except NotFoundError:
        await client.indices.create(index=settings.elastic_index, body=INDEX_MAPPINGS)
        logger.info("Created Elasticsearch index %s", settings.elastic_index)


class ElasticIntegration:
    @staticmethod
    async def index_product(product_data: dict[str, Any]) -> None:
        client = _client_or_none()
        if client is None:
            logger.debug("Elastic not configured; skipping index for %s", product_data.get("name"))
            return
        await _ensure_index(client)
        doc_id = str(product_data.get("id", ""))
        await client.index(index=settings.elastic_index, id=doc_id, document=product_data)

    @staticmethod
    async def bulk_index_products(products: list[dict[str, Any]]) -> int:
        client = _client_or_none()
        if client is None:
            return 0
        await _ensure_index(client)
        ops: list[dict[str, Any]] = []
        for p in products:
            ops.append({"index": {"_index": settings.elastic_index, "_id": str(p.get("id", ""))}})
            ops.append(p)
        resp = await client.bulk(operations=ops)
        errors = [item for item in resp["items"] if item.get("index", {}).get("error")]
        if errors:
            logger.warning("Bulk index had %d errors", len(errors))
        return len(resp["items"]) - len(errors)

    @staticmethod
    async def search_products(
        query: str, filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        client = _client_or_none()
        if client is None:
            return []
        filters = filters or {}

        range_filters: list[dict[str, Any]] = []
        if "price_max" in filters:
            range_filters.append({"range": {"price": {"lte": float(filters["price_max"])}}})
        if "store_id" in filters:
            range_filters.append({"term": {"store_id": str(filters["store_id"])}})
        if filters.get("in_stock"):
            range_filters.append({"term": {"in_stock": True}})

        body: dict[str, Any] = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": ["name^4", "description^2", "tags^1"],
                                "type": "best_fields",
                                "fuzziness": "AUTO",
                                "operator": "or",
                                "minimum_should_match": "30%",
                            }
                        }
                    ],
                    "filter": range_filters,
                }
            },
            "size": 20,
        }

        try:
            await _ensure_index(client)
            resp = await client.search(index=settings.elastic_index, body=body)
            return [hit["_source"] for hit in resp["hits"]["hits"]]
        except Exception as exc:
            logger.error("Elasticsearch search failed: %s", exc)
            return []
