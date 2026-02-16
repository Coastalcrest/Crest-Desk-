"""Health check and API tests for AI Assist service."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-assist"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_liveness(client):
    response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"
