"""Pydantic models for the AI Media service."""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MediaStyle(str, Enum):
    """Visual style for generated media."""

    MODERN = "modern"
    LUXURY = "luxury"
    RUSTIC = "rustic"
    MINIMALIST = "minimalist"
    PROFESSIONAL = "professional"


class SocialPlatform(str, Enum):
    """Target social media platform."""

    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"


class MediaStatus(str, Enum):
    """Status of a media generation job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ---------- Image models ---------- #


class ImageDimensions(BaseModel):
    """Image dimensions in pixels."""

    width: int = Field(default=1024, ge=256, le=4096)
    height: int = Field(default=1024, ge=256, le=4096)


class GenerateImageRequest(BaseModel):
    """Request to generate a real estate image."""

    prompt: str = Field(min_length=1, max_length=2000)
    style: MediaStyle = MediaStyle.PROFESSIONAL
    dimensions: ImageDimensions = Field(default_factory=ImageDimensions)
    property_address: str | None = None
    metadata: dict[str, Any] | None = None


class GenerateImageResponse(BaseModel):
    """Response containing generated image details."""

    id: str
    url: str
    prompt: str
    style: MediaStyle
    width: int
    height: int
    provider: str
    metadata: dict[str, Any] | None = None
    created_at: str


# ---------- Video models ---------- #


class GenerateVideoRequest(BaseModel):
    """Request to generate a property video."""

    property_address: str = Field(min_length=1, max_length=500)
    style: MediaStyle = MediaStyle.PROFESSIONAL
    duration: int = Field(default=30, ge=5, le=120, description="Duration in seconds")
    title: str | None = None
    description: str | None = None
    metadata: dict[str, Any] | None = None


class GenerateVideoResponse(BaseModel):
    """Response containing generated video details."""

    id: str
    url: str
    thumbnail_url: str
    property_address: str
    style: MediaStyle
    duration: int
    provider: str
    metadata: dict[str, Any] | None = None
    created_at: str


# ---------- Social graphic models ---------- #


class GenerateSocialRequest(BaseModel):
    """Request to generate a social media graphic."""

    template: str = Field(
        default="listing",
        description="Template name: listing, open_house, just_sold, price_drop",
    )
    text: str = Field(min_length=1, max_length=1000)
    platform: SocialPlatform = SocialPlatform.INSTAGRAM
    style: MediaStyle = MediaStyle.PROFESSIONAL
    property_address: str | None = None
    metadata: dict[str, Any] | None = None


class GenerateSocialResponse(BaseModel):
    """Response containing generated social graphic details."""

    id: str
    url: str
    template: str
    text: str
    platform: SocialPlatform
    style: MediaStyle
    width: int
    height: int
    provider: str
    metadata: dict[str, Any] | None = None
    created_at: str


# ---------- Batch models ---------- #


class BatchItem(BaseModel):
    """A single item in a batch generation request."""

    type: str = Field(description="One of: image, video, social")
    prompt: str | None = None
    property_address: str | None = None
    style: MediaStyle = MediaStyle.PROFESSIONAL
    template: str | None = None
    text: str | None = None
    platform: SocialPlatform | None = None
    width: int | None = None
    height: int | None = None
    duration: int | None = None


class BatchItemResult(BaseModel):
    """Result for a single batch item."""

    index: int
    type: str
    status: MediaStatus
    url: str | None = None
    error: str | None = None
    metadata: dict[str, Any] | None = None


class BatchGenerateRequest(BaseModel):
    """Request to generate multiple media items in a batch."""

    items: list[BatchItem] = Field(min_length=1, max_length=20)


class BatchGenerateResponse(BaseModel):
    """Response containing batch generation results."""

    id: str
    total: int
    completed: int
    failed: int
    results: list[BatchItemResult]
    created_at: str
