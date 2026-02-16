"""Tests for AI Assist help article endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_list_articles(client):
    response = await client.get("/api/articles")
    assert response.status_code == 200
    articles = response.json()["data"]
    assert len(articles) >= 5


@pytest.mark.asyncio
async def test_filter_articles_by_category(client):
    response = await client.get("/api/articles?category=compliance")
    assert response.status_code == 200
    articles = response.json()["data"]
    assert all(a["category"] == "compliance" for a in articles)


@pytest.mark.asyncio
async def test_search_articles(client):
    response = await client.get("/api/articles/search?q=compliance")
    assert response.status_code == 200
    articles = response.json()["data"]
    assert len(articles) >= 1


@pytest.mark.asyncio
async def test_get_article_by_slug(client):
    response = await client.get("/api/articles/getting-started")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["slug"] == "getting-started"


@pytest.mark.asyncio
async def test_article_not_found(client):
    response = await client.get("/api/articles/nonexistent-article")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_context_help(client):
    response = await client.get("/api/context-help?page=/dashboard/transactions")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["page"] == "/dashboard/transactions"
    assert "articles" in data
    assert "suggestions" in data
