"""CrestDesk Compliance Service."""
from ddtrace import tracer, patch_all
patch_all()

import structlog
from fastapi import FastAPI

from .config import settings

logger = structlog.get_logger()

app = FastAPI(
    title="CrestDesk Compliance",
    version="0.0.1",
    docs_url="/docs" if settings.debug else None,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "compliance"}
