"""CrestDesk AI Media Service -- AI image/video generation for real estate marketing."""
from contextlib import asynccontextmanager

from ddtrace import patch_all

patch_all()

import structlog
from fastapi import FastAPI

from .config import settings
from .routes import generate_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    logger.info("ai_media_starting", debug=settings.debug)
    yield
    logger.info("ai_media_stopping")


app = FastAPI(
    title="CrestDesk AI Media",
    description="AI image/video generation for real estate marketing",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

app.include_router(generate_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    has_api_key = bool(settings.openai_api_key)
    return {
        "status": "healthy",
        "service": "ai-media",
        "version": "1.0.0",
        "image_provider": "openai" if has_api_key else "placeholder",
    }


@app.get("/health/live")
async def liveness() -> dict:
    """Kubernetes liveness probe."""
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    """Kubernetes readiness probe."""
    return {"status": "ready"}
