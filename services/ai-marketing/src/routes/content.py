"""Content generation endpoints for AI Marketing."""
import structlog
from fastapi import APIRouter, HTTPException

from ..content_generator import (
    generate_email_campaign,
    generate_listing_description,
    generate_market_report,
    generate_social_caption,
    _generation_method,
)
from ..models import (
    EmailCampaignRequest,
    EmailCampaignResponse,
    ListingDescriptionRequest,
    ListingDescriptionResponse,
    MarketReportRequest,
    MarketReportResponse,
    SocialCaptionRequest,
    SocialCaptionResponse,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["content"])


@router.post("/listing-description", response_model=ListingDescriptionResponse)
async def create_listing_description(
    request: ListingDescriptionRequest,
) -> dict:
    """Generate an AI-powered listing description for a property.

    Uses Claude when ANTHROPIC_API_KEY is available, otherwise falls back
    to rich template-based generation.
    """
    logger.info(
        "listing_description_requested",
        address=request.property_details.address,
        tone=request.tone.value,
    )

    try:
        description, headline = await generate_listing_description(
            property_details=request.property_details,
            tone=request.tone,
            max_length=request.max_length,
            include_cta=request.include_call_to_action,
        )
    except Exception as exc:
        logger.error("listing_description_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="Failed to generate listing description",
        ) from exc

    word_count = len(description.split())

    return {
        "description": description,
        "headline": headline,
        "tone": request.tone,
        "word_count": word_count,
        "generated_by": _generation_method(),
    }


@router.post("/email-campaign", response_model=EmailCampaignResponse)
async def create_email_campaign(request: EmailCampaignRequest) -> dict:
    """Generate an AI-powered email campaign for real estate marketing.

    Produces subject line, preview text, email body, and call-to-action
    tailored to the specified audience, topic, and tone.
    """
    logger.info(
        "email_campaign_requested",
        audience=request.audience.value,
        topic=request.topic.value,
        tone=request.tone.value,
    )

    try:
        subject, preview_text, body, cta = await generate_email_campaign(
            audience=request.audience,
            topic=request.topic,
            tone=request.tone,
            agent_name=request.agent_name,
            brokerage_name=request.brokerage_name,
            property_address=request.property_address,
            key_points=request.key_points,
            area_name=request.area_name,
        )
    except Exception as exc:
        logger.error("email_campaign_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="Failed to generate email campaign",
        ) from exc

    return {
        "subject": subject,
        "preview_text": preview_text,
        "body": body,
        "call_to_action": cta,
        "audience": request.audience,
        "topic": request.topic,
        "tone": request.tone,
        "generated_by": _generation_method(),
    }


@router.post("/social-caption", response_model=SocialCaptionResponse)
async def create_social_caption(request: SocialCaptionRequest) -> dict:
    """Generate an AI-powered social media caption.

    Creates platform-appropriate captions with optional hashtags and emoji,
    tailored to the content type and desired tone.
    """
    logger.info(
        "social_caption_requested",
        platform=request.platform.value,
        content_type=request.content_type.value,
        tone=request.tone.value,
    )

    try:
        caption, hashtags = await generate_social_caption(
            platform=request.platform,
            content_type=request.content_type,
            tone=request.tone,
            property_address=request.property_address,
            key_details=request.key_details,
            agent_name=request.agent_name,
            include_hashtags=request.include_hashtags,
            include_emoji=request.include_emoji,
        )
    except Exception as exc:
        logger.error("social_caption_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="Failed to generate social caption",
        ) from exc

    return {
        "caption": caption,
        "hashtags": hashtags,
        "platform": request.platform,
        "content_type": request.content_type,
        "tone": request.tone,
        "character_count": len(caption),
        "generated_by": _generation_method(),
    }


@router.post("/market-report", response_model=MarketReportResponse)
async def create_market_report(request: MarketReportRequest) -> dict:
    """Generate an AI-powered market report summary.

    Produces a structured market report with configurable sections.
    Statistics are marked as [MLS DATA] placeholders to be filled
    with real data before publication.
    """
    logger.info(
        "market_report_requested",
        area=request.area,
        date_range_start=request.date_range_start.isoformat(),
        date_range_end=request.date_range_end.isoformat(),
    )

    if request.date_range_end < request.date_range_start:
        raise HTTPException(
            status_code=422,
            detail="date_range_end must be on or after date_range_start",
        )

    try:
        title, summary, report_body = await generate_market_report(
            area=request.area,
            date_range_start=request.date_range_start,
            date_range_end=request.date_range_end,
            property_type=request.property_type,
            include_sections=request.include_sections,
            agent_name=request.agent_name,
            brokerage_name=request.brokerage_name,
        )
    except Exception as exc:
        logger.error("market_report_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="Failed to generate market report",
        ) from exc

    date_range_str = (
        f"{request.date_range_start.isoformat()} to "
        f"{request.date_range_end.isoformat()}"
    )

    return {
        "title": title,
        "area": request.area,
        "date_range": date_range_str,
        "summary": summary,
        "report_body": report_body,
        "sections": request.include_sections,
        "generated_by": _generation_method(),
    }
