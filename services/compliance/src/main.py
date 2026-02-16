"""CrestDesk Compliance Service — Real estate content compliance engine."""
from contextlib import asynccontextmanager

from ddtrace import patch_all

patch_all()

import structlog
from fastapi import FastAPI

from .config import settings
from .database import check_database_health
from .routes import check_router, rules_router, validate_router
from .rules_engine import rules_engine

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    logger.info("compliance_service_starting", debug=settings.debug)

    # Warm up the rules engine (pre-compile regexes)
    _ = rules_engine

    db_healthy = await check_database_health()
    if db_healthy:
        logger.info("database_connection_healthy")
    else:
        logger.warning("database_connection_failed", msg="Service will start but DB rules won't load")

    yield

    logger.info("compliance_service_stopping")


app = FastAPI(
    title="CrestDesk Compliance",
    description="Real estate content compliance engine — Fair Housing, CAN-SPAM, state rules",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Mount route groups
app.include_router(check_router)
app.include_router(rules_router)
app.include_router(validate_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint with database status."""
    db_healthy = await check_database_health()
    return {
        "status": "healthy",
        "service": "compliance",
        "version": "1.0.0",
        "database": "connected" if db_healthy else "disconnected",
    }


@app.get("/health/live")
async def liveness() -> dict:
    """Kubernetes liveness probe — always returns 200 if process is running."""
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness() -> dict:
    """Kubernetes readiness probe — checks database connectivity."""
    db_healthy = await check_database_health()
    if not db_healthy:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "database_unavailable"},
        )
    return {"status": "ready"}
