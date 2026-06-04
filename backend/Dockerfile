FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
COPY migrations ./migrations
RUN uv sync --frozen --no-dev

# ── Runtime ───────────────────────────────────────────────────────────────────

FROM python:3.13-slim AS runtime

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY pyproject.toml ./

ENV PATH="/app/.venv/bin:$PATH"
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT}"]
