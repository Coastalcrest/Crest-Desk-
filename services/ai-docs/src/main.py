"""CrestDesk AI Docs Service.

AI-powered document processing: classification, text extraction,
compliance checking, and OCR for real estate documents.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from ddtrace import tracer, patch_all

patch_all()

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import documents_router

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: startup and shutdown hooks."""
    logger.info(
        "ai_docs_starting",
        version=app.version,
        debug=settings.debug,
        log_level=settings.log_level,
    )
    yield
    logger.info("ai_docs_shutting_down")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CrestDesk AI Docs",
    description="AI-powered document classification, extraction, compliance, and OCR",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount document processing routes
app.include_router(documents_router)


# ---------------------------------------------------------------------------
# Infrastructure endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-docs", "version": "1.0.0"}


@app.get("/live")
async def liveness() -> dict[str, str]:
    """Kubernetes liveness probe."""
    return {"status": "alive"}


@app.get("/ready")
async def readiness() -> dict[str, str | bool]:
    """Kubernetes readiness probe."""
    api_key_configured = bool(getattr(settings, "anthropic_api_key", ""))
    return {
        "status": "ready",
        "ai_available": api_key_configured,
    }
