"""Tests for AI Copilot conversation and intelligence endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_start_conversation(client):
    response = await client.post("/api/copilot", json={
        "message": "What's the status of my deals?",
        "context_type": "general",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["id"] is not None
    assert len(data["messages"]) == 2


@pytest.mark.asyncio
async def test_send_followup(client):
    start = await client.post("/api/copilot", json={"message": "Hello"})
    conv_id = start.json()["data"]["id"]

    response = await client.post(f"/api/copilot/{conv_id}/messages", json={
        "message": "Tell me about deadlines",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert "user_message" in data
    assert "assistant_message" in data


@pytest.mark.asyncio
async def test_get_conversation(client):
    start = await client.post("/api/copilot", json={"message": "Hello"})
    conv_id = start.json()["data"]["id"]

    response = await client.get(f"/api/copilot/{conv_id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == conv_id


@pytest.mark.asyncio
async def test_delete_conversation(client):
    start = await client.post("/api/copilot", json={"message": "Hello"})
    conv_id = start.json()["data"]["id"]

    response = await client.delete(f"/api/copilot/{conv_id}")
    assert response.status_code == 204

    get_response = await client.get(f"/api/copilot/{conv_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_one_shot_query(client):
    response = await client.post("/api/copilot/query", json={
        "query": "What are my upcoming deadlines?",
        "context_type": "general",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert "response" in data


@pytest.mark.asyncio
async def test_deals_overview(client):
    response = await client.get("/api/copilot/deals/overview")
    assert response.status_code == 200
    deals = response.json()["data"]
    assert len(deals) >= 1


@pytest.mark.asyncio
async def test_deal_summary(client):
    response = await client.get("/api/copilot/deals/deal-001/summary")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["deal"]["id"] == "deal-001"


@pytest.mark.asyncio
async def test_deal_not_found(client):
    response = await client.get("/api/copilot/deals/nonexistent/summary")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_deadlines(client):
    response = await client.get("/api/copilot/deadlines")
    assert response.status_code == 200
    deadlines = response.json()["data"]
    assert isinstance(deadlines, list)


@pytest.mark.asyncio
async def test_alerts(client):
    response = await client.get("/api/copilot/alerts")
    assert response.status_code == 200
    alerts = response.json()["data"]
    assert isinstance(alerts, list)


@pytest.mark.asyncio
async def test_feedback(client):
    start = await client.post("/api/copilot", json={"message": "Hello"})
    conv_id = start.json()["data"]["id"]
    msg_id = start.json()["data"]["messages"][1]["id"]  # assistant message

    response = await client.post(f"/api/copilot/{conv_id}/feedback", json={
        "message_id": msg_id,
        "rating": 5,
        "comment": "Very helpful!",
    })
    assert response.status_code == 200
    assert response.json()["data"]["feedback_rating"] == 5
