"""Pydantic models for the AI Marketing content generation service."""
from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class ContentTone(str, Enum):
    """Tone presets for generated marketing content."""

    PROFESSIONAL = "professional"
    LUXURY = "luxury"
    FIRST_TIME_BUYER = "first_time_buyer"
    INVESTOR = "investor"
    FAMILY_FRIENDLY = "family_friendly"


class SocialPlatform(str, Enum):
    """Supported social media platforms."""

    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"


class SocialContentType(str, Enum):
    """Types of social media content."""

    NEW_LISTING = "new_listing"
    OPEN_HOUSE = "open_house"
    JUST_SOLD = "just_sold"
    PRICE_REDUCTION = "price_reduction"
    MARKET_UPDATE = "market_update"
    AGENT_TIP = "agent_tip"
    TESTIMONIAL = "testimonial"


# ---------- Listing Description ---------- #


class PropertyDetails(BaseModel):
    """Core property details for listing description generation."""

    address: str = Field(min_length=1, max_length=500)
    property_type: str = Field(
        min_length=1,
        max_length=100,
        description="e.g. single-family, condo, townhouse, multi-family",
    )
    bedrooms: int = Field(ge=0, le=50)
    bathrooms: float = Field(ge=0, le=50)
    square_feet: int = Field(ge=0, le=100_000)
    lot_size: str | None = Field(
        default=None,
        max_length=100,
        description="e.g. 0.25 acres, 10,000 sq ft",
    )
    year_built: int | None = Field(default=None, ge=1700, le=2100)
    price: float | None = Field(default=None, ge=0)
    features: list[str] = Field(
        default_factory=list,
        max_length=30,
        description="Key features: granite countertops, hardwood floors, etc.",
    )
    neighborhood: str | None = Field(default=None, max_length=200)
    school_district: str | None = Field(default=None, max_length=200)
    hoa_fee: float | None = Field(default=None, ge=0)
    garage_spaces: int | None = Field(default=None, ge=0, le=20)
    additional_notes: str | None = Field(default=None, max_length=2000)


class ListingDescriptionRequest(BaseModel):
    """Request to generate a listing description."""

    property_details: PropertyDetails
    tone: ContentTone = ContentTone.PROFESSIONAL
    max_length: int = Field(default=500, ge=100, le=2000, description="Target word count")
    include_call_to_action: bool = True


class ListingDescriptionResponse(BaseModel):
    """Generated listing description."""

    description: str
    headline: str
    tone: ContentTone
    word_count: int
    generated_by: str = Field(description="'claude' or 'template'")


# ---------- Email Campaign ---------- #


class EmailAudience(str, Enum):
    """Target audience for email campaigns."""

    BUYERS = "buyers"
    SELLERS = "sellers"
    INVESTORS = "investors"
    PAST_CLIENTS = "past_clients"
    SPHERE_OF_INFLUENCE = "sphere_of_influence"
    GENERAL = "general"


class EmailTopic(str, Enum):
    """Topics for email campaigns."""

    NEW_LISTING = "new_listing"
    OPEN_HOUSE = "open_house"
    MARKET_UPDATE = "market_update"
    JUST_SOLD = "just_sold"
    NEWSLETTER = "newsletter"
    HOLIDAY_GREETING = "holiday_greeting"
    PRICE_REDUCTION = "price_reduction"
    FOLLOW_UP = "follow_up"


class EmailCampaignRequest(BaseModel):
    """Request to generate an email campaign."""

    audience: EmailAudience
    topic: EmailTopic
    tone: ContentTone = ContentTone.PROFESSIONAL
    property_address: str | None = Field(default=None, max_length=500)
    agent_name: str = Field(min_length=1, max_length=200)
    brokerage_name: str = Field(min_length=1, max_length=200)
    key_points: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Key points to emphasize in the email",
    )
    area_name: str | None = Field(default=None, max_length=200)


class EmailCampaignResponse(BaseModel):
    """Generated email campaign content."""

    subject: str
    preview_text: str
    body: str
    call_to_action: str
    audience: EmailAudience
    topic: EmailTopic
    tone: ContentTone
    generated_by: str


# ---------- Social Caption ---------- #


class SocialCaptionRequest(BaseModel):
    """Request to generate a social media caption."""

    platform: SocialPlatform
    content_type: SocialContentType
    tone: ContentTone = ContentTone.PROFESSIONAL
    property_address: str | None = Field(default=None, max_length=500)
    key_details: str | None = Field(
        default=None,
        max_length=1000,
        description="Key details to include in the caption",
    )
    agent_name: str | None = Field(default=None, max_length=200)
    include_hashtags: bool = True
    include_emoji: bool = True


class SocialCaptionResponse(BaseModel):
    """Generated social media caption."""

    caption: str
    hashtags: list[str]
    platform: SocialPlatform
    content_type: SocialContentType
    tone: ContentTone
    character_count: int
    generated_by: str


# ---------- Market Report ---------- #


class MarketReportRequest(BaseModel):
    """Request to generate a market report summary."""

    area: str = Field(min_length=1, max_length=300, description="City, neighborhood, or zip code")
    date_range_start: date
    date_range_end: date
    property_type: str | None = Field(
        default=None,
        max_length=100,
        description="Filter by property type",
    )
    include_sections: list[str] = Field(
        default_factory=lambda: [
            "overview",
            "pricing_trends",
            "inventory",
            "days_on_market",
            "forecast",
        ],
        description="Report sections to include",
    )
    agent_name: str | None = Field(default=None, max_length=200)
    brokerage_name: str | None = Field(default=None, max_length=200)


class MarketReportResponse(BaseModel):
    """Generated market report."""

    title: str
    area: str
    date_range: str
    summary: str
    report_body: str
    sections: list[str]
    generated_by: str
