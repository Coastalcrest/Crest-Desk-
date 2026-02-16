"""CrestDesk Preference Engine — FastAPI application."""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from ddtrace import patch_all
from fastapi import FastAPI

from .config import settings
from .routes.preferences import router as preferences_router

patch_all()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup / shutdown lifecycle."""
    logger.info(
        "preference_engine.starting",
        port=settings.port,
        debug=settings.debug,
    )
    yield
    logger.info("preference_engine.shutdown")


app = FastAPI(
    title="CrestDesk Preference Engine",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

app.include_router(preferences_router)


# ---- Health probes ---- #

@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "preference-engine", "version": "1.0.0"}


@app.get("/health/live")
async def liveness() -> dict:
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    # In production, check DB/Redis connectivity here
    return {"status": "ready"}
