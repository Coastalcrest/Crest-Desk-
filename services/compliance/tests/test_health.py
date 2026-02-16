"""Health check and liveness probe tests."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health_check(client):
    """Health endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "compliance"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_liveness(client):
    """Liveness probe returns alive."""
    response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"
