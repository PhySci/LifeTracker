from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import router
from backend.app.db import init_db
from backend.app.logging import configure_logging


configure_logging()
logger = logging.getLogger(__name__)


def _get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS")
    if configured_origins:
        return [
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ]
    if os.getenv("ENVIRONMENT") == "production":
        return []
    return ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting LifeTracker API")
    init_db()
    logger.info("Database schema initialized")
    try:
        yield
    finally:
        logger.info("Stopping LifeTracker API")


app = FastAPI(title="LifeTracker API", lifespan=lifespan)
cors_origins = _get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=bool(cors_origins) and "*" not in cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
