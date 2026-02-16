"""Tests for AI Media generation endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ------------------------------------------------------------------ #
#  Image generation
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_generate_image_defaults(client):
    """Generate image with default style and dimensions."""
    response = await client.post("/api/generate/image", json={
        "prompt": "Modern kitchen with granite countertops",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["url"].startswith("https://")
    assert data["style"] == "professional"
    assert data["width"] == 1024
    assert data["height"] == 1024
    assert data["prompt"] == "Modern kitchen with granite countertops"


@pytest.mark.asyncio
async def test_generate_image_custom_style(client):
    """Generate image with explicit luxury style."""
    response = await client.post("/api/generate/image", json={
        "prompt": "Oceanfront villa exterior",
        "style": "luxury",
        "dimensions": {"width": 1792, "height": 1024},
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["style"] == "luxury"
    assert data["width"] == 1792
    assert data["height"] == 1024


@pytest.mark.asyncio
async def test_generate_image_with_metadata(client):
    """Metadata is passed through to the response."""
    response = await client.post("/api/generate/image", json={
        "prompt": "Cozy living room",
        "metadata": {"listing_id": "L-12345", "agent": "Jane Doe"},
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["metadata"]["listing_id"] == "L-12345"


@pytest.mark.asyncio
async def test_generate_image_empty_prompt(client):
    """Empty prompt is rejected by validation."""
    response = await client.post("/api/generate/image", json={
        "prompt": "",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_image_invalid_dimensions(client):
    """Dimensions outside allowed range are rejected."""
    response = await client.post("/api/generate/image", json={
        "prompt": "A room",
        "dimensions": {"width": 100, "height": 100},
    })
    assert response.status_code == 422


# ------------------------------------------------------------------ #
#  Video generation
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_generate_video_defaults(client):
    """Generate video with default duration and style."""
    response = await client.post("/api/generate/video", json={
        "property_address": "123 Ocean Drive, Miami Beach, FL 33139",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["url"].endswith(".mp4")
    assert data["thumbnail_url"].endswith(".jpg")
    assert data["property_address"] == "123 Ocean Drive, Miami Beach, FL 33139"
    assert data["duration"] == 30
    assert data["style"] == "professional"


@pytest.mark.asyncio
async def test_generate_video_custom(client):
    """Generate video with custom duration and style."""
    response = await client.post("/api/generate/video", json={
        "property_address": "456 Mountain View Rd, Aspen, CO 81611",
        "style": "rustic",
        "duration": 60,
        "title": "Mountain Retreat Tour",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["style"] == "rustic"
    assert data["duration"] == 60


@pytest.mark.asyncio
async def test_generate_video_empty_address(client):
    """Empty property address is rejected."""
    response = await client.post("/api/generate/video", json={
        "property_address": "",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_video_duration_too_long(client):
    """Duration above 120 seconds is rejected."""
    response = await client.post("/api/generate/video", json={
        "property_address": "123 Main St",
        "duration": 300,
    })
    assert response.status_code == 422


# ------------------------------------------------------------------ #
#  Social graphic generation
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_generate_social_instagram(client):
    """Generate Instagram-sized social graphic."""
    response = await client.post("/api/generate/social", json={
        "text": "Just Listed! 4BR/3BA in Coral Gables",
        "platform": "instagram",
        "template": "listing",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["width"] == 1080
    assert data["height"] == 1080
    assert data["platform"] == "instagram"
    assert data["template"] == "listing"


@pytest.mark.asyncio
async def test_generate_social_facebook(client):
    """Generate Facebook-sized social graphic."""
    response = await client.post("/api/generate/social", json={
        "text": "Open House this Saturday!",
        "platform": "facebook",
        "template": "open_house",
        "style": "modern",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["width"] == 1200
    assert data["height"] == 630
    assert data["platform"] == "facebook"
    assert data["style"] == "modern"


@pytest.mark.asyncio
async def test_generate_social_linkedin(client):
    """Generate LinkedIn-sized social graphic."""
    response = await client.post("/api/generate/social", json={
        "text": "Market Update: Q4 Report",
        "platform": "linkedin",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["width"] == 1200
    assert data["height"] == 627


@pytest.mark.asyncio
async def test_generate_social_empty_text(client):
    """Empty text is rejected."""
    response = await client.post("/api/generate/social", json={
        "text": "",
    })
    assert response.status_code == 422


# ------------------------------------------------------------------ #
#  Batch generation
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_batch_generate_mixed(client):
    """Batch generates a mix of image, video, and social items."""
    response = await client.post("/api/generate/batch", json={
        "items": [
            {"type": "image", "prompt": "Modern kitchen", "style": "modern"},
            {"type": "video", "property_address": "789 Elm St", "duration": 15},
            {"type": "social", "text": "Just Sold!", "template": "just_sold", "platform": "instagram"},
        ],
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 3
    assert data["completed"] == 3
    assert data["failed"] == 0
    assert len(data["results"]) == 3
    assert data["results"][0]["type"] == "image"
    assert data["results"][0]["status"] == "completed"
    assert data["results"][1]["type"] == "video"
    assert data["results"][2]["type"] == "social"


@pytest.mark.asyncio
async def test_batch_generate_unsupported_type(client):
    """Unsupported media type in batch is marked as failed."""
    response = await client.post("/api/generate/batch", json={
        "items": [
            {"type": "image", "prompt": "A house"},
            {"type": "hologram", "prompt": "3D house"},
        ],
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 2
    assert data["completed"] == 1
    assert data["failed"] == 1
    assert data["results"][1]["status"] == "failed"
    assert "Unsupported" in data["results"][1]["error"]


@pytest.mark.asyncio
async def test_batch_generate_empty(client):
    """Empty batch is rejected by validation."""
    response = await client.post("/api/generate/batch", json={
        "items": [],
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_batch_generate_single_image(client):
    """Batch with a single image item succeeds."""
    response = await client.post("/api/generate/batch", json={
        "items": [
            {"type": "image", "prompt": "Spacious backyard with pool"},
        ],
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["completed"] == 1
    assert data["results"][0]["url"] is not None


# ------------------------------------------------------------------ #
#  Invalid style
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
async def test_invalid_style_rejected(client):
    """Unknown style value is rejected by validation."""
    response = await client.post("/api/generate/image", json={
        "prompt": "A house",
        "style": "gothic",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_platform_rejected(client):
    """Unknown platform value is rejected by validation."""
    response = await client.post("/api/generate/social", json={
        "text": "Hello",
        "platform": "myspace",
    })
    assert response.status_code == 422
