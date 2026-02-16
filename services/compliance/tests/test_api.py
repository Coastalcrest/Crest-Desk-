"""API endpoint integration tests."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestCheckEndpoint:
    """Tests for POST /api/check."""

    @pytest.mark.asyncio
    async def test_check_clean_content(self, client):
        """Clean content should return compliant response."""
        response = await client.post("/api/check", json={
            "content": "Beautiful 3-bedroom home with mountain views. Equal Housing Opportunity.",
            "content_type": "social_post",
            "state": "OR",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["compliant"] is True
        assert len(data["violations"]) == 0

    @pytest.mark.asyncio
    async def test_check_fair_housing_violation(self, client):
        """Content with Fair Housing violations should be flagged."""
        response = await client.post("/api/check", json={
            "content": "Adults only community, no children allowed.",
            "content_type": "social_post",
            "state": "OR",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["compliant"] is False
        assert len(data["violations"]) > 0

    @pytest.mark.asyncio
    async def test_check_email_without_unsubscribe(self, client):
        """Email without unsubscribe should fail CAN-SPAM."""
        response = await client.post("/api/check", json={
            "content": "Check out our latest listings!",
            "content_type": "email",
            "state": "OR",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["compliant"] is False
        canspam = [v for v in data["violations"] if "can_spam" in v["rule_key"]]
        assert len(canspam) == 1

    @pytest.mark.asyncio
    async def test_check_invalid_content_type(self, client):
        """Invalid content type should return 422."""
        response = await client.post("/api/check", json={
            "content": "Some content",
            "content_type": "invalid_type",
            "state": "OR",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_check_empty_content(self, client):
        """Empty content should return 422."""
        response = await client.post("/api/check", json={
            "content": "",
            "content_type": "social_post",
            "state": "OR",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_check_with_metadata(self, client):
        """Check with metadata should work fine."""
        response = await client.post("/api/check", json={
            "content": "Beautiful home for sale. Equal Housing Opportunity.",
            "content_type": "social_post",
            "state": "OR",
            "metadata": {"listing_id": "12345"},
        })
        assert response.status_code == 200
        assert response.json()["compliant"] is True


class TestBatchCheckEndpoint:
    """Tests for POST /api/check/batch."""

    @pytest.mark.asyncio
    async def test_batch_check(self, client):
        """Batch check should process multiple items."""
        response = await client.post("/api/check/batch", json={
            "items": [
                {
                    "content": "Beautiful home. Equal Housing Opportunity.",
                    "content_type": "social_post",
                    "state": "OR",
                },
                {
                    "content": "Adults only community.",
                    "content_type": "social_post",
                    "state": "OR",
                },
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["total_compliant"] + data["total_non_compliant"] == 2


class TestQuickValidateEndpoint:
    """Tests for POST /api/validate/quick."""

    @pytest.mark.asyncio
    async def test_quick_validate_clean(self, client):
        """Clean content should have no issues."""
        response = await client.post("/api/validate/quick", json={
            "content": "Beautiful 3-bedroom home with great views.",
            "content_type": "social_post",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["has_issues"] is False
        assert data["issue_count"] == 0

    @pytest.mark.asyncio
    async def test_quick_validate_critical_term(self, client):
        """Critical Fair Housing term should be caught."""
        response = await client.post("/api/validate/quick", json={
            "content": "This is an adults only community.",
            "content_type": "social_post",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["has_issues"] is True
        assert data["severity"] == "critical"


class TestRulesEndpoints:
    """Tests for rules listing endpoints."""

    @pytest.mark.asyncio
    async def test_list_states(self, client):
        """States endpoint should return all 51 entries."""
        response = await client.get("/api/states")
        assert response.status_code == 200
        states = response.json()
        assert len(states) == 51  # 50 states + DC
        assert {"code": "OR", "name": "Oregon"} in states

    @pytest.mark.asyncio
    async def test_invalid_state_code(self, client):
        """Invalid state code should return 400."""
        response = await client.get("/api/rules/XX")
        assert response.status_code == 400
