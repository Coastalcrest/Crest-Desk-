"""Tests for AI Marketing content generation endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Listing Description Tests
# ---------------------------------------------------------------------------


SAMPLE_PROPERTY = {
    "address": "123 Ocean View Drive, Coastal City, FL 33139",
    "property_type": "single-family",
    "bedrooms": 4,
    "bathrooms": 3.5,
    "square_feet": 2800,
    "lot_size": "0.35 acres",
    "year_built": 2018,
    "price": 895000,
    "features": [
        "granite countertops",
        "hardwood floors",
        "stainless steel appliances",
        "covered lanai",
        "impact windows",
    ],
    "neighborhood": "Ocean View Estates",
    "school_district": "Coastal County Schools",
    "garage_spaces": 2,
    "additional_notes": "Recently renovated primary suite.",
}


@pytest.mark.asyncio
async def test_listing_description_professional(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "professional",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "professional"
    assert data["generated_by"] == "template"
    assert data["word_count"] > 0
    assert len(data["description"]) > 100
    assert len(data["headline"]) > 0
    # Should include property details
    assert "123 Ocean View Drive" in data["description"]
    assert "4" in data["description"]  # bedrooms
    assert "2,800" in data["description"]  # square feet


@pytest.mark.asyncio
async def test_listing_description_luxury_tone(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "luxury",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "luxury"
    # Luxury tone should use elevated language
    desc_lower = data["description"].lower()
    assert any(
        word in desc_lower
        for word in ["exquisite", "elegant", "stunning", "refined", "unparalleled"]
    )


@pytest.mark.asyncio
async def test_listing_description_first_time_buyer(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "first_time_buyer",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "first_time_buyer"
    desc_lower = data["description"].lower()
    assert any(
        phrase in desc_lower
        for phrase in ["first home", "dream home", "move-in ready", "equity"]
    )


@pytest.mark.asyncio
async def test_listing_description_investor_tone(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "investor",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "investor"
    desc_lower = data["description"].lower()
    assert "investment" in desc_lower


@pytest.mark.asyncio
async def test_listing_description_family_friendly(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "family_friendly",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["tone"] == "family_friendly"
    desc_lower = data["description"].lower()
    assert any(word in desc_lower for word in ["family", "families", "spacious"])


@pytest.mark.asyncio
async def test_listing_description_includes_cta(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "professional",
        "include_call_to_action": True,
    })
    data = response.json()
    desc_lower = data["description"].lower()
    assert any(
        phrase in desc_lower
        for phrase in ["contact", "schedule", "showing", "call"]
    )


@pytest.mark.asyncio
async def test_listing_description_no_cta(client):
    response = await client.post("/api/listing-description", json={
        "property_details": SAMPLE_PROPERTY,
        "tone": "professional",
        "include_call_to_action": False,
    })
    data = response.json()
    # Should not end with a call-to-action about scheduling
    assert "schedule a private showing" not in data["description"].lower()


@pytest.mark.asyncio
async def test_listing_description_minimal_property(client):
    """Should work with minimal required fields."""
    response = await client.post("/api/listing-description", json={
        "property_details": {
            "address": "456 Simple St",
            "property_type": "condo",
            "bedrooms": 2,
            "bathrooms": 1,
            "square_feet": 900,
        },
        "tone": "professional",
    })
    assert response.status_code == 200
    data = response.json()
    assert "456 Simple St" in data["description"]


@pytest.mark.asyncio
async def test_listing_description_validation_error(client):
    """Should reject invalid property details."""
    response = await client.post("/api/listing-description", json={
        "property_details": {
            "address": "",
            "property_type": "house",
            "bedrooms": -1,
            "bathrooms": 2,
            "square_feet": 1000,
        },
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Email Campaign Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_email_campaign_new_listing(client):
    response = await client.post("/api/email-campaign", json={
        "audience": "buyers",
        "topic": "new_listing",
        "tone": "professional",
        "agent_name": "Jane Smith",
        "brokerage_name": "Coastal Crest Realty",
        "property_address": "123 Ocean View Drive",
        "key_points": [
            "4 bedrooms with ocean views",
            "Recently renovated kitchen",
            "Walking distance to the beach",
        ],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["audience"] == "buyers"
    assert data["topic"] == "new_listing"
    assert len(data["subject"]) > 0
    assert len(data["body"]) > 0
    assert len(data["call_to_action"]) > 0
    assert "Jane Smith" in data["body"]
    assert "Coastal Crest Realty" in data["body"]


@pytest.mark.asyncio
async def test_email_campaign_market_update(client):
    response = await client.post("/api/email-campaign", json={
        "audience": "general",
        "topic": "market_update",
        "tone": "professional",
        "agent_name": "John Doe",
        "brokerage_name": "Coastal Crest Realty",
        "area_name": "Downtown Miami",
    })
    assert response.status_code == 200
    data = response.json()
    assert "market" in data["subject"].lower() or "update" in data["subject"].lower()
    assert "Downtown Miami" in data["body"]


@pytest.mark.asyncio
async def test_email_campaign_open_house(client):
    response = await client.post("/api/email-campaign", json={
        "audience": "buyers",
        "topic": "open_house",
        "tone": "family_friendly",
        "agent_name": "Maria Garcia",
        "brokerage_name": "Coastal Crest Realty",
        "property_address": "789 Family Lane",
    })
    assert response.status_code == 200
    data = response.json()
    assert "open house" in data["subject"].lower()


@pytest.mark.asyncio
async def test_email_campaign_just_sold(client):
    response = await client.post("/api/email-campaign", json={
        "audience": "past_clients",
        "topic": "just_sold",
        "tone": "professional",
        "agent_name": "Alex Chen",
        "brokerage_name": "Coastal Crest Realty",
        "property_address": "100 Success Blvd",
    })
    assert response.status_code == 200
    data = response.json()
    assert "sold" in data["subject"].lower()


@pytest.mark.asyncio
async def test_email_campaign_includes_key_points(client):
    key_points = ["Point A", "Point B", "Point C"]
    response = await client.post("/api/email-campaign", json={
        "audience": "buyers",
        "topic": "new_listing",
        "tone": "professional",
        "agent_name": "Test Agent",
        "brokerage_name": "Test Brokerage",
        "key_points": key_points,
    })
    data = response.json()
    for point in key_points:
        assert point in data["body"]


@pytest.mark.asyncio
async def test_email_campaign_validation_error(client):
    """Should reject missing required fields."""
    response = await client.post("/api/email-campaign", json={
        "audience": "buyers",
        "topic": "new_listing",
        # Missing agent_name and brokerage_name
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Social Caption Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_social_caption_instagram_new_listing(client):
    response = await client.post("/api/social-caption", json={
        "platform": "instagram",
        "content_type": "new_listing",
        "tone": "professional",
        "property_address": "123 Ocean View Drive",
        "key_details": "Stunning 4BR oceanfront home with panoramic views",
        "agent_name": "Jane Smith",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "instagram"
    assert data["content_type"] == "new_listing"
    assert len(data["caption"]) > 0
    assert len(data["hashtags"]) > 0
    assert data["character_count"] == len(data["caption"])
    assert "JustListed" in data["hashtags"]


@pytest.mark.asyncio
async def test_social_caption_facebook_open_house(client):
    response = await client.post("/api/social-caption", json={
        "platform": "facebook",
        "content_type": "open_house",
        "tone": "family_friendly",
        "property_address": "456 Family St",
        "agent_name": "Agent Bob",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "facebook"
    assert "OPEN HOUSE" in data["caption"]


@pytest.mark.asyncio
async def test_social_caption_just_sold(client):
    response = await client.post("/api/social-caption", json={
        "platform": "linkedin",
        "content_type": "just_sold",
        "tone": "professional",
        "property_address": "789 Sold Ave",
    })
    assert response.status_code == 200
    data = response.json()
    assert "JUST SOLD" in data["caption"]
    assert "JustSold" in data["hashtags"]


@pytest.mark.asyncio
async def test_social_caption_no_hashtags(client):
    response = await client.post("/api/social-caption", json={
        "platform": "twitter",
        "content_type": "market_update",
        "tone": "investor",
        "include_hashtags": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["hashtags"] == []


@pytest.mark.asyncio
async def test_social_caption_no_emoji(client):
    response = await client.post("/api/social-caption", json={
        "platform": "linkedin",
        "content_type": "agent_tip",
        "tone": "professional",
        "include_emoji": False,
    })
    assert response.status_code == 200
    data = response.json()
    # Should not start with emoji
    assert not data["caption"][0] in "\U0001f3e0\U0001f389\U0001f6aa\U0001f4b0\U0001f4ca\U0001f4a1\u2b50"


@pytest.mark.asyncio
async def test_social_caption_testimonial(client):
    response = await client.post("/api/social-caption", json={
        "platform": "facebook",
        "content_type": "testimonial",
        "tone": "professional",
        "key_details": "The best agent we have ever worked with!",
        "agent_name": "Jane Doe",
    })
    assert response.status_code == 200
    data = response.json()
    assert "CLIENT SPOTLIGHT" in data["caption"]
    assert "best agent" in data["caption"]


# ---------------------------------------------------------------------------
# Market Report Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_market_report_full(client):
    response = await client.post("/api/market-report", json={
        "area": "Miami Beach, FL",
        "date_range_start": "2025-01-01",
        "date_range_end": "2025-06-30",
        "property_type": "single-family",
        "include_sections": [
            "overview",
            "pricing_trends",
            "inventory",
            "days_on_market",
            "forecast",
        ],
        "agent_name": "Jane Smith",
        "brokerage_name": "Coastal Crest Realty",
    })
    assert response.status_code == 200
    data = response.json()
    assert "Miami Beach" in data["title"]
    assert data["area"] == "Miami Beach, FL"
    assert len(data["summary"]) > 50
    assert len(data["report_body"]) > 200
    assert "MARKET OVERVIEW" in data["report_body"]
    assert "PRICING TRENDS" in data["report_body"]
    assert "INVENTORY" in data["report_body"]
    assert "DAYS ON MARKET" in data["report_body"]
    assert "MARKET FORECAST" in data["report_body"]
    assert "Jane Smith" in data["report_body"]
    assert "Coastal Crest Realty" in data["report_body"]


@pytest.mark.asyncio
async def test_market_report_partial_sections(client):
    response = await client.post("/api/market-report", json={
        "area": "Austin, TX",
        "date_range_start": "2025-03-01",
        "date_range_end": "2025-03-31",
        "include_sections": ["overview", "forecast"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "MARKET OVERVIEW" in data["report_body"]
    assert "MARKET FORECAST" in data["report_body"]
    # Should NOT include unrequested sections
    assert "PRICING TRENDS" not in data["report_body"]
    assert "INVENTORY ANALYSIS" not in data["report_body"]


@pytest.mark.asyncio
async def test_market_report_contains_placeholders(client):
    """Template report should contain [MLS DATA] placeholders for real stats."""
    response = await client.post("/api/market-report", json={
        "area": "Denver, CO",
        "date_range_start": "2025-01-01",
        "date_range_end": "2025-12-31",
    })
    assert response.status_code == 200
    data = response.json()
    assert "[MLS DATA" in data["report_body"]


@pytest.mark.asyncio
async def test_market_report_invalid_date_range(client):
    """Should reject when end date is before start date."""
    response = await client.post("/api/market-report", json={
        "area": "Seattle, WA",
        "date_range_start": "2025-06-30",
        "date_range_end": "2025-01-01",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_market_report_date_range_in_response(client):
    response = await client.post("/api/market-report", json={
        "area": "Portland, OR",
        "date_range_start": "2025-01-01",
        "date_range_end": "2025-06-30",
    })
    assert response.status_code == 200
    data = response.json()
    assert "2025-01-01" in data["date_range"]
    assert "2025-06-30" in data["date_range"]


# ---------------------------------------------------------------------------
# Cross-cutting tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_all_endpoints_return_generated_by(client):
    """All content endpoints should indicate generation method."""
    listing_res = await client.post("/api/listing-description", json={
        "property_details": {
            "address": "1 Test St",
            "property_type": "condo",
            "bedrooms": 1,
            "bathrooms": 1,
            "square_feet": 500,
        },
    })
    email_res = await client.post("/api/email-campaign", json={
        "audience": "general",
        "topic": "newsletter",
        "agent_name": "Test",
        "brokerage_name": "Test",
    })
    social_res = await client.post("/api/social-caption", json={
        "platform": "instagram",
        "content_type": "new_listing",
    })
    report_res = await client.post("/api/market-report", json={
        "area": "Test City",
        "date_range_start": "2025-01-01",
        "date_range_end": "2025-12-31",
    })

    for res in [listing_res, email_res, social_res, report_res]:
        assert res.status_code == 200
        assert res.json()["generated_by"] in ("claude", "template")


@pytest.mark.asyncio
async def test_invalid_tone_rejected(client):
    """Should reject invalid tone values."""
    response = await client.post("/api/listing-description", json={
        "property_details": {
            "address": "1 Test St",
            "property_type": "condo",
            "bedrooms": 1,
            "bathrooms": 1,
            "square_feet": 500,
        },
        "tone": "not_a_valid_tone",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_platform_rejected(client):
    """Should reject invalid platform values."""
    response = await client.post("/api/social-caption", json={
        "platform": "myspace",
        "content_type": "new_listing",
    })
    assert response.status_code == 422
