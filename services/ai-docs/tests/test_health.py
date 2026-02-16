"""Enhanced health / infrastructure endpoint tests."""

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app


@pytest.fixture
def transport():
    return ASGITransport(app=app)


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_check(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-docs"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_check_returns_json(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.headers["content-type"] == "application/json"


# ---------------------------------------------------------------------------
# /live
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_liveness(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/live")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"


# ---------------------------------------------------------------------------
# /ready
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_readiness(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "ai_available" in data


@pytest.mark.asyncio
async def test_readiness_ai_available_field_is_bool(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ready")
    data = response.json()
    assert isinstance(data["ai_available"], bool)


# ---------------------------------------------------------------------------
# 404 for unknown routes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unknown_route_returns_404(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/nonexistent")
    assert response.status_code == 404
