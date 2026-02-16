"""Media generation with provider abstraction.

Uses DALL-E (OpenAI) when OPENAI_API_KEY is available, otherwise returns
placeholder URLs so the service can run in development without credentials.
"""
from datetime import datetime, timezone
from uuid import uuid4

import structlog

from .config import settings

logger = structlog.get_logger()

# Platform-specific dimensions for social graphics
SOCIAL_DIMENSIONS: dict[str, tuple[int, int]] = {
    "instagram": (1080, 1080),
    "facebook": (1200, 630),
    "linkedin": (1200, 627),
    "twitter": (1600, 900),
    "tiktok": (1080, 1920),
}

PLACEHOLDER_BASE = "https://media.crestdesk.dev/placeholder"


def _now_iso() -> str:
    """Return current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def _placeholder_image_url(width: int, height: int, style: str) -> str:
    """Build a deterministic placeholder URL."""
    return f"{PLACEHOLDER_BASE}/image/{width}x{height}/{style}/{uuid4().hex[:8]}.png"


def _placeholder_video_url(duration: int, style: str) -> str:
    """Build a deterministic placeholder URL for video."""
    return f"{PLACEHOLDER_BASE}/video/{duration}s/{style}/{uuid4().hex[:8]}.mp4"


def _placeholder_thumbnail_url(style: str) -> str:
    """Build a placeholder thumbnail URL."""
    return f"{PLACEHOLDER_BASE}/thumbnail/{style}/{uuid4().hex[:8]}.jpg"


async def _generate_image_openai(
    prompt: str,
    width: int,
    height: int,
) -> str:
    """Call OpenAI DALL-E API to generate an image.

    Args:
        prompt: Text description for the image.
        width: Desired width in pixels.
        height: Desired height in pixels.

    Returns:
        URL of the generated image.
    """
    import httpx

    size = _openai_size(width, height)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.image_model,
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": "standard",
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["url"]


def _openai_size(width: int, height: int) -> str:
    """Map arbitrary dimensions to DALL-E supported sizes."""
    if width == height:
        return "1024x1024"
    if width > height:
        return "1792x1024"
    return "1024x1792"


async def generate_image(
    prompt: str,
    style: str,
    width: int = 1024,
    height: int = 1024,
) -> dict:
    """Generate a real estate image.

    Args:
        prompt: Text description for the image.
        style: Visual style (modern, luxury, etc.).
        width: Desired width in pixels.
        height: Desired height in pixels.

    Returns:
        Dict with id, url, provider, and metadata.
    """
    image_id = str(uuid4())
    styled_prompt = f"{style} style real estate photo: {prompt}"

    if settings.openai_api_key:
        try:
            url = await _generate_image_openai(styled_prompt, width, height)
            provider = "openai"
            logger.info(
                "image_generated",
                provider=provider,
                image_id=image_id,
                style=style,
            )
        except Exception:
            logger.exception(
                "openai_image_generation_failed",
                image_id=image_id,
            )
            url = _placeholder_image_url(width, height, style)
            provider = "placeholder"
    else:
        url = _placeholder_image_url(width, height, style)
        provider = "placeholder"
        logger.info(
            "image_generated_placeholder",
            image_id=image_id,
            style=style,
        )

    return {
        "id": image_id,
        "url": url,
        "provider": provider,
        "width": width,
        "height": height,
        "created_at": _now_iso(),
    }


async def generate_video(
    property_address: str,
    style: str,
    duration: int = 30,
) -> dict:
    """Generate a property video.

    Currently returns placeholder URLs. Real implementation would call
    a video generation provider (e.g., Synthesia, RunwayML).

    Args:
        property_address: Address of the property.
        style: Visual style.
        duration: Video duration in seconds.

    Returns:
        Dict with id, url, thumbnail_url, provider, and metadata.
    """
    video_id = str(uuid4())
    url = _placeholder_video_url(duration, style)
    thumbnail_url = _placeholder_thumbnail_url(style)
    provider = "placeholder"

    logger.info(
        "video_generated_placeholder",
        video_id=video_id,
        property_address=property_address,
        style=style,
        duration=duration,
    )

    return {
        "id": video_id,
        "url": url,
        "thumbnail_url": thumbnail_url,
        "provider": provider,
        "duration": duration,
        "created_at": _now_iso(),
    }


async def generate_social_graphic(
    template: str,
    text: str,
    platform: str,
    style: str = "professional",
) -> dict:
    """Generate a social media graphic.

    Currently returns placeholder URLs. Real implementation would compose
    an image using template engine and optional AI background.

    Args:
        template: Template name (listing, open_house, just_sold, price_drop).
        text: Overlay text for the graphic.
        platform: Target platform (determines dimensions).
        style: Visual style.

    Returns:
        Dict with id, url, dimensions, provider, and metadata.
    """
    graphic_id = str(uuid4())
    width, height = SOCIAL_DIMENSIONS.get(platform, (1080, 1080))
    url = _placeholder_image_url(width, height, style)
    provider = "placeholder"

    logger.info(
        "social_graphic_generated_placeholder",
        graphic_id=graphic_id,
        template=template,
        platform=platform,
        style=style,
    )

    return {
        "id": graphic_id,
        "url": url,
        "provider": provider,
        "width": width,
        "height": height,
        "created_at": _now_iso(),
    }
