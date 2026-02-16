"""Tests for the preference engine API."""
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
def headers():
    return {"X-User-Id": "user-123", "X-Tenant-Id": "tenant-456"}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_health(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "preference-engine"


@pytest.mark.anyio
async def test_health_live(client: AsyncClient):
    res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "alive"


@pytest.mark.anyio
async def test_health_ready(client: AsyncClient):
    res = await client.get("/health/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"


@pytest.mark.anyio
async def test_track_event(client: AsyncClient, headers: dict):
    res = await client.post(
        "/api/events/track",
        json={"event_type": "page_view", "resource_type": "dashboard", "metadata": {"section": "overview"}},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["tracked"] is True
    assert "event_id" in data


@pytest.mark.anyio
async def test_batch_track(client: AsyncClient, headers: dict):
    events = [
        {"event_type": "page_view", "metadata": {"page": "transactions"}},
        {"event_type": "feature_use", "metadata": {"feature": "compliance_check"}},
        {"event_type": "contact_interaction", "resource_id": "contact-1"},
    ]
    res = await client.post("/api/events/track/batch", json={"events": events}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["tracked"] == 3
    assert data["failed"] == 0


@pytest.mark.anyio
async def test_get_empty_preferences(client: AsyncClient, headers: dict):
    res = await client.get("/api/preferences", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == "user-123"
    assert data["preferences"] == []


@pytest.mark.anyio
async def test_update_and_get_preferences(client: AsyncClient, headers: dict):
    # Update communication preferences
    res = await client.put(
        "/api/preferences",
        json={
            "category": "communication",
            "preferences": {"voice_tone": "professional", "writing_style": "formal"},
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["preferences"]) == 1
    assert data["preferences"][0]["category"] == "communication"
    assert data["preferences"][0]["preferences"]["voice_tone"] == "professional"

    # Merge additional preferences
    res = await client.put(
        "/api/preferences",
        json={
            "category": "communication",
            "preferences": {"language": "en"},
            "merge": True,
        },
        headers=headers,
    )
    assert res.status_code == 200
    prefs = res.json()["preferences"][0]["preferences"]
    assert prefs["voice_tone"] == "professional"
    assert prefs["language"] == "en"


@pytest.mark.anyio
async def test_replace_preferences(client: AsyncClient, headers: dict):
    # Set initial
    await client.put(
        "/api/preferences",
        json={"category": "media", "preferences": {"style": "modern", "colors": ["blue"]}},
        headers=headers,
    )
    # Replace entirely
    res = await client.put(
        "/api/preferences",
        json={"category": "media", "preferences": {"style": "classic"}, "merge": False},
        headers=headers,
    )
    assert res.status_code == 200
    prefs = res.json()["preferences"][0]["preferences"]
    assert prefs == {"style": "classic"}
    assert "colors" not in prefs


@pytest.mark.anyio
async def test_delete_preferences(client: AsyncClient, headers: dict):
    # Set preferences
    await client.put(
        "/api/preferences",
        json={"category": "notifications", "preferences": {"email": True, "sms": False}},
        headers=headers,
    )
    # Delete
    res = await client.delete("/api/preferences/notifications", headers=headers)
    assert res.status_code == 200
    assert res.json()["deleted"] is True


@pytest.mark.anyio
async def test_delete_nonexistent_preferences(client: AsyncClient, headers: dict):
    res = await client.delete("/api/preferences/scheduling", headers=headers)
    assert res.status_code == 404


@pytest.mark.anyio
async def test_recommendations(client: AsyncClient, headers: dict):
    # Track some events to influence recommendations
    for i in range(5):
        await client.post(
            "/api/events/track",
            json={"event_type": "contact_interaction", "resource_id": f"contact-{i}"},
            headers=headers,
        )

    res = await client.post(
        "/api/recommendations",
        json={"types": ["contact_followup", "content_create"], "limit": 5},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == "user-123"
    assert len(data["recommendations"]) > 0
    assert all(r["type"] in ["contact_followup", "content_create"] for r in data["recommendations"])


@pytest.mark.anyio
async def test_behavior_summary(client: AsyncClient, headers: dict):
    # Track events first
    await client.post(
        "/api/events/track",
        json={"event_type": "feature_use", "metadata": {"feature": "document_templates"}},
        headers=headers,
    )
    await client.post(
        "/api/events/track",
        json={"event_type": "feature_use", "metadata": {"feature": "ai_assist"}},
        headers=headers,
    )

    res = await client.get("/api/behavior/summary?period_days=7", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == "user-123"
    assert data["total_events"] > 0
    assert data["period_days"] == 7


@pytest.mark.anyio
async def test_clear_user_data(client: AsyncClient, headers: dict):
    # Track events
    await client.post(
        "/api/events/track",
        json={"event_type": "page_view"},
        headers=headers,
    )
    # Clear
    res = await client.delete("/api/user-data", headers=headers)
    assert res.status_code == 200
    assert res.json()["cleared"] is True

    # Verify cleared
    res = await client.get("/api/behavior/summary", headers=headers)
    assert res.json()["total_events"] == 0


@pytest.mark.anyio
async def test_track_event_validation(client: AsyncClient, headers: dict):
    res = await client.post(
        "/api/events/track",
        json={"event_type": "invalid_type"},
        headers=headers,
    )
    assert res.status_code == 422


@pytest.mark.anyio
async def test_missing_auth_headers(client: AsyncClient):
    res = await client.post("/api/events/track", json={"event_type": "page_view"})
    assert res.status_code == 422
