"""Tests for AI Assist chat/conversation endpoints."""
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
    response = await client.post("/api/conversations", json={
        "message": "How do I create a new transaction?",
        "context_page": "/dashboard/transactions",
    })
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["id"] is not None
    assert data["status"] == "active"
    assert len(data["messages"]) == 2  # user + assistant


@pytest.mark.asyncio
async def test_send_followup_message(client):
    # Start conversation
    start_res = await client.post("/api/conversations", json={
        "message": "Help with transactions",
    })
    conv_id = start_res.json()["data"]["id"]

    # Send follow-up
    response = await client.post(f"/api/conversations/{conv_id}/messages", json={
        "message": "How do I add documents to it?",
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert "user_message" in data
    assert "assistant_message" in data


@pytest.mark.asyncio
async def test_get_conversation(client):
    # Start conversation
    start_res = await client.post("/api/conversations", json={
        "message": "Tell me about compliance",
    })
    conv_id = start_res.json()["data"]["id"]

    # Get it
    response = await client.get(f"/api/conversations/{conv_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == conv_id
    assert len(data["messages"]) >= 2


@pytest.mark.asyncio
async def test_list_conversations(client):
    # Create a conversation
    await client.post("/api/conversations", json={"message": "Hello"})

    response = await client.get("/api/conversations")
    assert response.status_code == 200
    assert "data" in response.json()
    assert "pagination" in response.json()


@pytest.mark.asyncio
async def test_escalate_conversation(client):
    start_res = await client.post("/api/conversations", json={
        "message": "I have a complex issue",
    })
    conv_id = start_res.json()["data"]["id"]

    response = await client.post(f"/api/conversations/{conv_id}/escalate", json={
        "subject": "Need help with compliance",
        "description": "I have a complex compliance question that requires human support.",
    })
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "escalated"


@pytest.mark.asyncio
async def test_conversation_not_found(client):
    response = await client.get("/api/conversations/nonexistent-id")
    assert response.status_code == 404
