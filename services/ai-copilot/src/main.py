"""CrestDesk AI Copilot Service — Intelligent real estate assistant."""
from contextlib import asynccontextmanager

from ddtrace import patch_all

patch_all()

import structlog
from fastapi import FastAPI

from .config import settings
from .routes import copilot_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ai_copilot_starting", debug=settings.debug)
    yield
    logger.info("ai_copilot_stopping")


app = FastAPI(
    title="CrestDesk AI Copilot",
    description="Intelligent real estate assistant with deal insights, alerts, and tool-use",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

app.include_router(copilot_router)


@app.get("/health")
async def health_check() -> dict:
    import os
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return {
        "status": "healthy",
        "service": "ai-copilot",
        "version": "1.0.0",
        "llm_provider": "claude" if has_api_key else "template",
    }


@app.get("/health/live")
async def liveness() -> dict:
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    return {"status": "ready"}
