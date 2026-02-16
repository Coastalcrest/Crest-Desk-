"""CrestDesk AI Assist Service — Conversational help and knowledge base."""
from contextlib import asynccontextmanager

from ddtrace import patch_all

patch_all()

import structlog
from fastapi import FastAPI

from .config import settings
from .routes import chat_router, articles_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan hooks."""
    logger.info("ai_assist_starting", debug=settings.debug)
    yield
    logger.info("ai_assist_stopping")


app = FastAPI(
    title="CrestDesk AI Assist",
    description="Conversational help assistant and knowledge base for CrestDesk users",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Mount routes
app.include_router(chat_router)
app.include_router(articles_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    import os
    has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return {
        "status": "healthy",
        "service": "ai-assist",
        "version": "1.0.0",
        "llm_provider": "claude" if has_api_key else "template",
    }


@app.get("/health/live")
async def liveness() -> dict:
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    return {"status": "ready"}
