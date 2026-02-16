"""CrestDesk AI Marketing Service -- AI content generation for real estate."""
from contextlib import asynccontextmanager

from ddtrace import patch_all

patch_all()

import os

import structlog
from fastapi import FastAPI

from .config import settings
from .routes import content_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan hooks."""
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    logger.info(
        "ai_marketing_starting",
        debug=settings.debug,
        llm_provider="claude" if has_api_key else "template",
    )
    yield
    logger.info("ai_marketing_stopping")


app = FastAPI(
    title="CrestDesk AI Marketing",
    description="AI-powered content generation for real estate marketing",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Mount routes
app.include_router(content_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return {
        "status": "healthy",
        "service": "ai-marketing",
        "version": "1.0.0",
        "llm_provider": "claude" if has_api_key else "template",
    }


@app.get("/health/live")
async def liveness() -> dict:
    """Liveness probe for container orchestration."""
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    """Readiness probe for container orchestration."""
    return {"status": "ready"}
