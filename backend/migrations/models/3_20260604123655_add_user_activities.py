from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "user_activities" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(13) NOT NULL,
    "query" VARCHAR(512),
    "feature" VARCHAR(128),
    "metadata" JSONB,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "user_activities"."event_type" IS 'search: search\nfeature_usage: feature_usage';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "user_activities";"""


MODELS_STATE = (
    "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"
)
