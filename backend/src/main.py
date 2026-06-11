import asyncio
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise import Tortoise

from src.api.v1.router import router
from src.config import settings
from src.db.connection import TORTOISE_ORM

_BACKEND_DIR = Path(__file__).resolve().parent.parent


async def _run_migrations() -> None:
    aerich_bin = Path(sys.executable).parent / "aerich"
    proc = await asyncio.create_subprocess_exec(
        str(aerich_bin),
        "upgrade",
        cwd=str(_BACKEND_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"Migration failed:\n{stderr.decode()}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.google_application_credentials:
        creds_path = Path(settings.google_application_credentials)
        if not creds_path.is_absolute():
            creds_path = (_BACKEND_DIR / creds_path).resolve()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds_path)
    await _run_migrations()
    await Tortoise.init(config=TORTOISE_ORM)
    yield
    await Tortoise.close_connections()


app = FastAPI(title="RetailCortex API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
