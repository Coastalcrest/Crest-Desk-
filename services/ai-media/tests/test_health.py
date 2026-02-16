"""Health and infrastructure tests for AI Media service."""
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
    """Health endpoint returns service metadata."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-media"
    assert data["version"] == "1.0.0"
    assert data["image_provider"] in ("openai", "placeholder")


@pytest.mark.asyncio
async def test_liveness(client):
    """Liveness probe returns alive status."""
    response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"


@pytest.mark.asyncio
async def test_readiness(client):
    """Readiness probe returns ready status."""
    response = await client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_docs_available_in_debug(client):
    """OpenAPI docs are served when debug is enabled."""
    response = await client.get("/docs")
    # In debug mode the docs page returns 200
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(client):
    """OpenAPI JSON schema is accessible."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "CrestDesk AI Media"
    assert "/api/generate/image" in schema["paths"]
    assert "/api/generate/video" in schema["paths"]
    assert "/api/generate/social" in schema["paths"]
    assert "/api/generate/batch" in schema["paths"]
