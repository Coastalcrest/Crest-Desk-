"""Content generation engine for AI Marketing.

Uses Claude API when ANTHROPIC_API_KEY is set, otherwise falls back to
rich template-based generation with placeholder substitution.
"""
import os
import textwrap
from datetime import date

import structlog

from .models import (
    ContentTone,
    EmailAudience,
    EmailTopic,
    PropertyDetails,
    SocialContentType,
    SocialPlatform,
)

logger = structlog.get_logger()

# Try to import anthropic SDK
try:
    import anthropic

    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    logger.info("anthropic_sdk_not_installed", fallback="template_responses")


# ---------------------------------------------------------------------------
# Tone descriptors used by both Claude prompts and templates
# ---------------------------------------------------------------------------

TONE_DESCRIPTORS: dict[ContentTone, dict[str, str]] = {
    ContentTone.PROFESSIONAL: {
        "adjective": "well-appointed",
        "style": "polished and authoritative",
        "greeting": "Dear",
        "voice": "confident, knowledgeable, straightforward",
    },
    ContentTone.LUXURY: {
        "adjective": "exquisite",
        "style": "elegant and aspirational",
        "greeting": "Dear",
        "voice": "sophisticated, refined, exclusive",
    },
    ContentTone.FIRST_TIME_BUYER: {
        "adjective": "charming",
        "style": "warm and approachable",
        "greeting": "Hi",
        "voice": "friendly, encouraging, informative",
    },
    ContentTone.INVESTOR: {
        "adjective": "high-performing",
        "style": "data-driven and analytical",
        "greeting": "Hello",
        "voice": "analytical, ROI-focused, concise",
    },
    ContentTone.FAMILY_FRIENDLY: {
        "adjective": "spacious",
        "style": "warm and inviting",
        "greeting": "Hi",
        "voice": "warm, relatable, community-focused",
    },
}


# ---------------------------------------------------------------------------
# Claude-based generation
# ---------------------------------------------------------------------------

LISTING_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a professional real estate copywriter for CrestDesk, a real estate
    transaction platform. Generate compelling property listing descriptions that
    are accurate, engaging, and compliant with Fair Housing Act guidelines.

    Rules:
    - Never use discriminatory language or reference protected classes
    - Do not make guarantees about property values or investment returns
    - Be factual about property features; do not fabricate amenities
    - Match the requested tone precisely
    - Include a call-to-action when requested
""")

EMAIL_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a professional real estate email copywriter for CrestDesk. Generate
    email campaign content that is engaging, professional, and CAN-SPAM compliant.

    Rules:
    - Content must be truthful and not misleading
    - Include clear sender identification
    - Never use high-pressure or deceptive tactics
    - Match the requested tone and audience
    - Keep subject lines under 60 characters
    - Include a clear call-to-action
""")

SOCIAL_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a social media copywriter for real estate professionals using CrestDesk.
    Generate platform-appropriate captions that drive engagement while remaining
    compliant with Fair Housing Act and platform guidelines.

    Rules:
    - Respect platform character limits and best practices
    - Never use discriminatory language
    - Include relevant hashtags when requested
    - Match the requested tone
    - Instagram: visual, story-driven, up to 2200 chars
    - Facebook: conversational, community-focused, moderate length
    - LinkedIn: professional, market-insight focused
    - Twitter/X: concise, punchy, under 280 chars
    - TikTok: trendy, casual, hook-driven
""")

MARKET_REPORT_SYSTEM_PROMPT = textwrap.dedent("""\
    You are a real estate market analyst for CrestDesk. Generate professional
    market report summaries that provide valuable insights for agents and clients.

    Rules:
    - Present data objectively without making guarantees
    - Include appropriate disclaimers about market projections
    - Use clear section headers
    - Be data-driven but accessible
    - Note that actual statistics should be verified with MLS data
""")


async def _call_claude(system_prompt: str, user_prompt: str) -> str:
    """Call Claude API with the given prompts.

    Args:
        system_prompt: System-level instructions for Claude.
        user_prompt: User-level prompt with specific request details.

    Returns:
        Claude's response text.
    """
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


def _has_claude() -> bool:
    """Check whether Claude API is available."""
    return HAS_ANTHROPIC and bool(os.environ.get("ANTHROPIC_API_KEY"))


def _generation_method() -> str:
    """Return the name of the active generation method."""
    return "claude" if _has_claude() else "template"


# ---------------------------------------------------------------------------
# 1. Listing Description
# ---------------------------------------------------------------------------

async def generate_listing_description(
    property_details: PropertyDetails,
    tone: ContentTone,
    max_length: int = 500,
    include_cta: bool = True,
) -> tuple[str, str]:
    """Generate a property listing description and headline.

    Args:
        property_details: Structured property information.
        tone: Desired writing tone.
        max_length: Target word count.
        include_cta: Whether to append a call-to-action.

    Returns:
        Tuple of (description, headline).
    """
    if _has_claude():
        try:
            return await _listing_with_claude(property_details, tone, max_length, include_cta)
        except Exception as exc:
            logger.error("claude_listing_error", error=str(exc))

    return _listing_from_template(property_details, tone, max_length, include_cta)


async def _listing_with_claude(
    details: PropertyDetails,
    tone: ContentTone,
    max_length: int,
    include_cta: bool,
) -> tuple[str, str]:
    """Generate listing description via Claude."""
    features_str = ", ".join(details.features) if details.features else "not specified"
    prompt = textwrap.dedent(f"""\
        Generate a real estate listing description with the following details:

        Address: {details.address}
        Property type: {details.property_type}
        Bedrooms: {details.bedrooms}
        Bathrooms: {details.bathrooms}
        Square feet: {details.square_feet:,}
        Lot size: {details.lot_size or 'N/A'}
        Year built: {details.year_built or 'N/A'}
        Price: {'${:,.0f}'.format(details.price) if details.price else 'N/A'}
        Features: {features_str}
        Neighborhood: {details.neighborhood or 'N/A'}
        School district: {details.school_district or 'N/A'}
        Garage spaces: {details.garage_spaces or 'N/A'}
        Additional notes: {details.additional_notes or 'None'}

        Tone: {tone.value} ({TONE_DESCRIPTORS[tone]['voice']})
        Target length: approximately {max_length} words
        Include call-to-action: {include_cta}

        Respond in exactly this format:
        HEADLINE: <compelling one-line headline>
        DESCRIPTION: <full listing description>
    """)

    text = await _call_claude(LISTING_SYSTEM_PROMPT, prompt)

    # Parse response
    headline = ""
    description = text
    if "HEADLINE:" in text and "DESCRIPTION:" in text:
        parts = text.split("DESCRIPTION:", 1)
        headline = parts[0].replace("HEADLINE:", "").strip()
        description = parts[1].strip()
    elif "HEADLINE:" in text:
        lines = text.split("\n", 1)
        headline = lines[0].replace("HEADLINE:", "").strip()
        description = lines[1].strip() if len(lines) > 1 else ""

    return description, headline


def _listing_from_template(
    details: PropertyDetails,
    tone: ContentTone,
    max_length: int,
    include_cta: bool,
) -> tuple[str, str]:
    """Generate listing description from rich templates.

    Uses detailed placeholder substitution to produce realistic,
    ready-to-use listing descriptions.
    """
    td = TONE_DESCRIPTORS[tone]
    adj = td["adjective"]
    price_str = "${:,.0f}".format(details.price) if details.price else "Contact for price"
    sqft_str = f"{details.square_feet:,}"

    # Build feature highlights
    feature_highlights = ""
    if details.features:
        feature_list = details.features[:6]
        if len(feature_list) <= 2:
            feature_highlights = " and ".join(feature_list)
        else:
            feature_highlights = (
                ", ".join(feature_list[:-1]) + ", and " + feature_list[-1]
            )

    # Neighborhood & school context
    neighborhood_line = ""
    if details.neighborhood:
        neighborhood_line = (
            f"Nestled in the sought-after {details.neighborhood} neighborhood, "
            f"residents enjoy easy access to local dining, shopping, and recreation."
        )

    school_line = ""
    if details.school_district:
        school_line = (
            f" Zoned for the highly regarded {details.school_district}, "
            f"this location is ideal for families prioritizing education."
        )

    garage_line = ""
    if details.garage_spaces and details.garage_spaces > 0:
        garage_word = "space" if details.garage_spaces == 1 else "spaces"
        garage_line = (
            f" A {details.garage_spaces}-car garage provides ample parking and storage."
        )

    year_line = ""
    if details.year_built:
        year_line = f" Built in {details.year_built},"

    lot_line = ""
    if details.lot_size:
        lot_line = f" situated on a {details.lot_size} lot,"

    # ---- Tone-specific templates ----

    if tone == ContentTone.LUXURY:
        headline = f"Unparalleled Elegance at {details.address}"
        description = (
            f"Welcome to {details.address} -- an {adj} {details.property_type} "
            f"that redefines sophisticated living.{year_line} this stunning residence "
            f"spans {sqft_str} square feet of meticulously designed space,{lot_line} "
            f"offering {details.bedrooms} bedrooms and {details.bathrooms} bathrooms "
            f"of uncompromising quality."
        )
        if feature_highlights:
            description += (
                f" Discerning buyers will appreciate the exceptional finishes "
                f"including {feature_highlights}."
            )
        if neighborhood_line:
            description += f" {neighborhood_line}"
        description += f"{school_line}{garage_line}"
        if details.additional_notes:
            description += f" {details.additional_notes}"
        description += f" Offered at {price_str}."

    elif tone == ContentTone.FIRST_TIME_BUYER:
        headline = f"Your Dream Home Awaits at {details.address}"
        description = (
            f"Looking for your first home? This {adj} {details.property_type} at "
            f"{details.address} checks all the boxes! With {details.bedrooms} bedrooms "
            f"and {details.bathrooms} bathrooms across {sqft_str} sq ft, there is "
            f"plenty of room to grow."
        )
        if feature_highlights:
            description += (
                f" You will love the {feature_highlights} that make this home "
                f"truly move-in ready."
            )
        if neighborhood_line:
            description += f" {neighborhood_line}"
        description += f"{school_line}{garage_line}"
        if details.additional_notes:
            description += f" {details.additional_notes}"
        description += (
            f" Priced at {price_str}, this is an outstanding opportunity "
            f"to start building equity in a wonderful community."
        )

    elif tone == ContentTone.INVESTOR:
        headline = f"Investment Opportunity: {details.property_type.title()} at {details.address}"
        description = (
            f"Strong investment opportunity at {details.address}. This {adj} "
            f"{details.property_type} features {details.bedrooms} bed / "
            f"{details.bathrooms} bath across {sqft_str} sq ft{lot_line}."
        )
        if feature_highlights:
            description += f" Key features: {feature_highlights}."
        if neighborhood_line:
            description += f" {neighborhood_line}"
        description += f"{school_line}{garage_line}"
        if details.year_built:
            description += f" Year built: {details.year_built}."
        if details.hoa_fee is not None:
            description += f" HOA: ${details.hoa_fee:,.0f}/month."
        if details.additional_notes:
            description += f" {details.additional_notes}"
        description += f" Listed at {price_str}."

    elif tone == ContentTone.FAMILY_FRIENDLY:
        headline = f"A Place Your Family Will Love: {details.address}"
        description = (
            f"Welcome home to {details.address}! This {adj} {details.property_type} "
            f"is perfect for families, offering {details.bedrooms} generous bedrooms "
            f"and {details.bathrooms} bathrooms across {sqft_str} square feet "
            f"of comfortable living space."
        )
        if feature_highlights:
            description += (
                f" The whole family will enjoy {feature_highlights}."
            )
        if neighborhood_line:
            description += f" {neighborhood_line}"
        if details.school_district:
            description += (
                f" Parents will appreciate being zoned for "
                f"{details.school_district}."
            )
        description += f"{garage_line}"
        if details.additional_notes:
            description += f" {details.additional_notes}"
        description += f" All this for {price_str}."

    else:  # PROFESSIONAL (default)
        headline = f"{details.bedrooms} BD / {details.bathrooms} BA {details.property_type.title()} at {details.address}"
        description = (
            f"This {adj} {details.property_type} at {details.address} offers "
            f"{details.bedrooms} bedrooms and {details.bathrooms} bathrooms across "
            f"{sqft_str} square feet of well-designed living space."
        )
        if year_line:
            description = description[:-1] + f".{year_line} the property" + (
                f"{lot_line} combines" if lot_line else " combines"
            ) + " timeless appeal with modern functionality."
        if feature_highlights:
            description += f" Notable features include {feature_highlights}."
        if neighborhood_line:
            description += f" {neighborhood_line}"
        description += f"{school_line}{garage_line}"
        if details.additional_notes:
            description += f" {details.additional_notes}"
        description += f" Listed at {price_str}."

    # Call to action
    if include_cta:
        description += (
            " Contact us today to schedule a private showing and experience "
            "this exceptional property firsthand."
        )

    return description, headline


# ---------------------------------------------------------------------------
# 2. Email Campaign
# ---------------------------------------------------------------------------

async def generate_email_campaign(
    audience: EmailAudience,
    topic: EmailTopic,
    tone: ContentTone,
    agent_name: str,
    brokerage_name: str,
    property_address: str | None = None,
    key_points: list[str] | None = None,
    area_name: str | None = None,
) -> tuple[str, str, str, str]:
    """Generate email campaign content.

    Args:
        audience: Target audience segment.
        topic: Email topic/purpose.
        tone: Desired writing tone.
        agent_name: Sending agent's name.
        brokerage_name: Brokerage name.
        property_address: Property address if applicable.
        key_points: Key points to highlight.
        area_name: Area/market name if applicable.

    Returns:
        Tuple of (subject, preview_text, body, call_to_action).
    """
    if _has_claude():
        try:
            return await _email_with_claude(
                audience, topic, tone, agent_name, brokerage_name,
                property_address, key_points, area_name,
            )
        except Exception as exc:
            logger.error("claude_email_error", error=str(exc))

    return _email_from_template(
        audience, topic, tone, agent_name, brokerage_name,
        property_address, key_points, area_name,
    )


async def _email_with_claude(
    audience: EmailAudience,
    topic: EmailTopic,
    tone: ContentTone,
    agent_name: str,
    brokerage_name: str,
    property_address: str | None,
    key_points: list[str] | None,
    area_name: str | None,
) -> tuple[str, str, str, str]:
    """Generate email campaign via Claude."""
    points_str = "\n".join(f"- {p}" for p in key_points) if key_points else "None specified"
    prompt = textwrap.dedent(f"""\
        Generate a real estate email campaign with the following parameters:

        Audience: {audience.value}
        Topic: {topic.value}
        Tone: {tone.value} ({TONE_DESCRIPTORS[tone]['voice']})
        Agent name: {agent_name}
        Brokerage: {brokerage_name}
        Property address: {property_address or 'N/A'}
        Area: {area_name or 'N/A'}
        Key points:
        {points_str}

        Respond in exactly this format:
        SUBJECT: <email subject line, under 60 chars>
        PREVIEW: <preview text, under 100 chars>
        BODY: <full email body in plain text>
        CTA: <call-to-action text>
    """)

    text = await _call_claude(EMAIL_SYSTEM_PROMPT, prompt)

    subject = preview = body = cta = ""
    for marker, field in [
        ("SUBJECT:", "subject"),
        ("PREVIEW:", "preview"),
        ("BODY:", "body"),
        ("CTA:", "cta"),
    ]:
        if marker in text:
            # Find everything between this marker and the next
            start = text.index(marker) + len(marker)
            # Find the next marker
            remaining = text[start:]
            next_markers = ["SUBJECT:", "PREVIEW:", "BODY:", "CTA:"]
            next_markers.remove(marker)
            end = len(remaining)
            for nm in next_markers:
                if nm in remaining:
                    pos = remaining.index(nm)
                    if pos < end:
                        end = pos
            value = remaining[:end].strip()
            if field == "subject":
                subject = value
            elif field == "preview":
                preview = value
            elif field == "body":
                body = value
            elif field == "cta":
                cta = value

    return subject, preview, body, cta


def _email_from_template(
    audience: EmailAudience,
    topic: EmailTopic,
    tone: ContentTone,
    agent_name: str,
    brokerage_name: str,
    property_address: str | None,
    key_points: list[str] | None,
    area_name: str | None,
) -> tuple[str, str, str, str]:
    """Generate email campaign from templates."""
    td = TONE_DESCRIPTORS[tone]
    greeting = td["greeting"]
    area = area_name or "your area"

    # Key-points paragraph
    points_paragraph = ""
    if key_points:
        points_paragraph = "\n\nHere are the key highlights:\n" + "\n".join(
            f"  - {point}" for point in key_points
        )

    # ---- Subject + body by topic ----

    if topic == EmailTopic.NEW_LISTING:
        addr = property_address or "an Exciting New Property"
        subject = f"Just Listed: {addr}"
        preview = f"A stunning new listing from {agent_name}"
        body = (
            f"{greeting},\n\n"
            f"I am thrilled to announce a brand-new listing at {addr}. "
            f"This property is now available and I wanted to make sure you "
            f"were among the first to know."
            f"{points_paragraph}\n\n"
            f"I would love to arrange a private showing at your convenience. "
            f"Please do not hesitate to reach out with any questions.\n\n"
            f"Warm regards,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Schedule Your Private Showing Today"

    elif topic == EmailTopic.OPEN_HOUSE:
        addr = property_address or "a Featured Property"
        subject = f"You Are Invited: Open House at {addr}"
        preview = f"Join us this weekend for an exclusive open house"
        body = (
            f"{greeting},\n\n"
            f"You are cordially invited to an open house at {addr}. "
            f"Come see this beautiful property in person and discover everything "
            f"it has to offer."
            f"{points_paragraph}\n\n"
            f"Light refreshments will be served. I look forward to welcoming you!\n\n"
            f"Best regards,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "RSVP for the Open House"

    elif topic == EmailTopic.JUST_SOLD:
        addr = property_address or "a Recent Sale"
        subject = f"Just Sold: {addr}"
        preview = f"Another successful closing by {agent_name}"
        body = (
            f"{greeting},\n\n"
            f"I am pleased to share that {addr} has officially closed! "
            f"It was a privilege to guide the transaction from listing to close. "
            f"This is a testament to the strength of {area}'s real estate market."
            f"{points_paragraph}\n\n"
            f"If you are considering buying or selling, I would be happy to "
            f"discuss how current market conditions could work in your favor.\n\n"
            f"Sincerely,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Get Your Free Market Analysis"

    elif topic == EmailTopic.MARKET_UPDATE:
        subject = f"{area.title()} Real Estate Market Update"
        preview = f"See the latest trends in {area}"
        body = (
            f"{greeting},\n\n"
            f"Here is your latest market update for {area}. Staying informed "
            f"about local trends helps you make confident real estate decisions, "
            f"whether you are buying, selling, or investing."
            f"{points_paragraph}\n\n"
            f"The market continues to evolve, and I am here to help you "
            f"navigate every step of the way. Reach out anytime for a "
            f"personalized consultation.\n\n"
            f"Best,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Request a Personalized Market Report"

    elif topic == EmailTopic.PRICE_REDUCTION:
        addr = property_address or "a Featured Property"
        subject = f"Price Reduced: {addr}"
        preview = f"New price alert from {agent_name}"
        body = (
            f"{greeting},\n\n"
            f"Great news -- the price has just been reduced on {addr}! "
            f"This is an excellent opportunity to secure a wonderful property "
            f"at an even better value."
            f"{points_paragraph}\n\n"
            f"Properties at this price point tend to move quickly. "
            f"Contact me today to schedule a showing before it is gone.\n\n"
            f"Best regards,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Schedule a Showing Now"

    elif topic == EmailTopic.NEWSLETTER:
        subject = f"Your Monthly Real Estate Digest from {agent_name}"
        preview = f"Market insights, tips, and featured properties"
        body = (
            f"{greeting},\n\n"
            f"Welcome to this month's real estate newsletter! I have curated "
            f"the latest market insights, tips, and featured properties "
            f"to keep you informed about {area}'s real estate landscape."
            f"{points_paragraph}\n\n"
            f"As always, I am just a phone call or email away if you have "
            f"any questions or want to discuss your real estate goals.\n\n"
            f"Cheers,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Read the Full Newsletter"

    elif topic == EmailTopic.HOLIDAY_GREETING:
        subject = f"Happy Holidays from {agent_name} at {brokerage_name}"
        preview = f"Wishing you warmth and joy this holiday season"
        body = (
            f"{greeting},\n\n"
            f"As the year draws to a close, I wanted to take a moment to "
            f"thank you for your trust and friendship. It has been a pleasure "
            f"serving your real estate needs, and I look forward to helping "
            f"you achieve your goals in the year ahead.\n\n"
            f"Wishing you and your loved ones a joyful holiday season "
            f"and a prosperous new year.\n\n"
            f"Warmly,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Let Us Start Planning Your 2025 Goals"

    else:  # FOLLOW_UP and fallback
        subject = f"Following Up -- {agent_name}, {brokerage_name}"
        preview = f"A quick follow-up from {agent_name}"
        body = (
            f"{greeting},\n\n"
            f"I hope this message finds you well. I wanted to follow up "
            f"and see if you have any questions or if there is anything "
            f"I can help you with regarding real estate in {area}."
            f"{points_paragraph}\n\n"
            f"Whether you are looking to buy, sell, or simply stay informed "
            f"about the market, I am here to help.\n\n"
            f"Best regards,\n"
            f"{agent_name}\n"
            f"{brokerage_name}"
        )
        cta = "Let Us Connect"

    return subject, preview, body, cta


# ---------------------------------------------------------------------------
# 3. Social Caption
# ---------------------------------------------------------------------------

async def generate_social_caption(
    platform: SocialPlatform,
    content_type: SocialContentType,
    tone: ContentTone,
    property_address: str | None = None,
    key_details: str | None = None,
    agent_name: str | None = None,
    include_hashtags: bool = True,
    include_emoji: bool = True,
) -> tuple[str, list[str]]:
    """Generate a social media caption with hashtags.

    Args:
        platform: Target social platform.
        content_type: Type of social content.
        tone: Desired writing tone.
        property_address: Property address if applicable.
        key_details: Additional details to incorporate.
        agent_name: Agent name for attribution.
        include_hashtags: Whether to generate hashtags.
        include_emoji: Whether to include emoji in caption.

    Returns:
        Tuple of (caption, hashtags_list).
    """
    if _has_claude():
        try:
            return await _social_with_claude(
                platform, content_type, tone, property_address,
                key_details, agent_name, include_hashtags, include_emoji,
            )
        except Exception as exc:
            logger.error("claude_social_error", error=str(exc))

    return _social_from_template(
        platform, content_type, tone, property_address,
        key_details, agent_name, include_hashtags, include_emoji,
    )


async def _social_with_claude(
    platform: SocialPlatform,
    content_type: SocialContentType,
    tone: ContentTone,
    property_address: str | None,
    key_details: str | None,
    agent_name: str | None,
    include_hashtags: bool,
    include_emoji: bool,
) -> tuple[str, list[str]]:
    """Generate social caption via Claude."""
    prompt = textwrap.dedent(f"""\
        Generate a social media caption for:

        Platform: {platform.value}
        Content type: {content_type.value}
        Tone: {tone.value} ({TONE_DESCRIPTORS[tone]['voice']})
        Property address: {property_address or 'N/A'}
        Key details: {key_details or 'N/A'}
        Agent name: {agent_name or 'N/A'}
        Include hashtags: {include_hashtags}
        Include emoji: {include_emoji}

        Respond in exactly this format:
        CAPTION: <the caption text>
        HASHTAGS: <comma-separated hashtags without # symbol>
    """)

    text = await _call_claude(SOCIAL_SYSTEM_PROMPT, prompt)

    caption = text
    hashtags: list[str] = []
    if "CAPTION:" in text and "HASHTAGS:" in text:
        parts = text.split("HASHTAGS:", 1)
        caption = parts[0].replace("CAPTION:", "").strip()
        raw_tags = parts[1].strip()
        hashtags = [
            tag.strip().lstrip("#")
            for tag in raw_tags.split(",")
            if tag.strip()
        ]
    elif "CAPTION:" in text:
        caption = text.replace("CAPTION:", "").strip()

    return caption, hashtags


def _social_from_template(
    platform: SocialPlatform,
    content_type: SocialContentType,
    tone: ContentTone,
    property_address: str | None,
    key_details: str | None,
    agent_name: str | None,
    include_hashtags: bool,
    include_emoji: bool,
) -> tuple[str, list[str]]:
    """Generate social caption from templates."""
    addr = property_address or "this stunning property"
    details = key_details or ""
    agent = agent_name or "your local real estate expert"
    emoji_new = "\U0001f3e0 " if include_emoji else ""
    emoji_sold = "\U0001f389 " if include_emoji else ""
    emoji_open = "\U0001f6aa " if include_emoji else ""
    emoji_price = "\U0001f4b0 " if include_emoji else ""
    emoji_chart = "\U0001f4ca " if include_emoji else ""
    emoji_bulb = "\U0001f4a1 " if include_emoji else ""
    emoji_star = "\u2b50 " if include_emoji else ""

    # Base hashtags by content type
    base_hashtags = {
        SocialContentType.NEW_LISTING: [
            "JustListed", "NewListing", "RealEstate", "HomeForSale", "DreamHome",
        ],
        SocialContentType.OPEN_HOUSE: [
            "OpenHouse", "RealEstate", "HomeTour", "HouseHunting", "WeekendOpenHouse",
        ],
        SocialContentType.JUST_SOLD: [
            "JustSold", "Sold", "RealEstate", "ClosingDay", "HappyClients",
        ],
        SocialContentType.PRICE_REDUCTION: [
            "PriceReduced", "PriceDrop", "RealEstate", "HomeForSale", "GreatDeal",
        ],
        SocialContentType.MARKET_UPDATE: [
            "MarketUpdate", "RealEstateMarket", "HousingMarket", "MarketTrends",
        ],
        SocialContentType.AGENT_TIP: [
            "RealEstateTips", "HomeBuyingTips", "RealEstateAdvice", "ProTip",
        ],
        SocialContentType.TESTIMONIAL: [
            "ClientReview", "Testimonial", "HappyHomeowner", "RealEstateAgent",
        ],
    }

    # Build caption by content type
    if content_type == SocialContentType.NEW_LISTING:
        caption = (
            f"{emoji_new}JUST LISTED! Welcome to {addr}. "
            f"{details + ' ' if details else ''}"
            f"This one will not last long! Contact {agent} for details."
        )
    elif content_type == SocialContentType.OPEN_HOUSE:
        caption = (
            f"{emoji_open}OPEN HOUSE this weekend at {addr}! "
            f"{details + ' ' if details else ''}"
            f"Come see it in person. {agent} will be on-site to answer "
            f"all your questions."
        )
    elif content_type == SocialContentType.JUST_SOLD:
        caption = (
            f"{emoji_sold}JUST SOLD! Congratulations to the new owners of {addr}! "
            f"{details + ' ' if details else ''}"
            f"Another successful closing. Thank you for trusting {agent} "
            f"with this important milestone."
        )
    elif content_type == SocialContentType.PRICE_REDUCTION:
        caption = (
            f"{emoji_price}PRICE REDUCED on {addr}! "
            f"{details + ' ' if details else ''}"
            f"Now is your chance -- this incredible value will not last. "
            f"Reach out to {agent} today."
        )
    elif content_type == SocialContentType.MARKET_UPDATE:
        caption = (
            f"{emoji_chart}MARKET UPDATE: What is happening in local real estate? "
            f"{details + ' ' if details else ''}"
            f"Stay informed and make smart decisions. "
            f"Contact {agent} for a personalized market analysis."
        )
    elif content_type == SocialContentType.AGENT_TIP:
        caption = (
            f"{emoji_bulb}PRO TIP: "
            f"{details or 'The best time to start your real estate journey is now.'} "
            f"Want more insights? Follow {agent} for weekly tips!"
        )
    else:  # TESTIMONIAL
        caption = (
            f"{emoji_star}CLIENT SPOTLIGHT: "
            f"{details or 'Working with an experienced agent makes all the difference.'} "
            f"Thank you for choosing {agent}!"
        )

    # Platform-specific adjustments
    if platform == SocialPlatform.TWITTER and len(caption) > 250:
        # Truncate for Twitter, leave room for hashtags
        caption = caption[:247] + "..."

    hashtags = base_hashtags.get(content_type, ["RealEstate"])
    if not include_hashtags:
        hashtags = []

    return caption, hashtags


# ---------------------------------------------------------------------------
# 4. Market Report
# ---------------------------------------------------------------------------

async def generate_market_report(
    area: str,
    date_range_start: date,
    date_range_end: date,
    property_type: str | None = None,
    include_sections: list[str] | None = None,
    agent_name: str | None = None,
    brokerage_name: str | None = None,
) -> tuple[str, str, str]:
    """Generate a market report summary.

    Args:
        area: Target geographic area.
        date_range_start: Report period start.
        date_range_end: Report period end.
        property_type: Filter by property type.
        include_sections: Report sections to include.
        agent_name: Agent name for attribution.
        brokerage_name: Brokerage name for attribution.

    Returns:
        Tuple of (title, summary, report_body).
    """
    if _has_claude():
        try:
            return await _market_report_with_claude(
                area, date_range_start, date_range_end,
                property_type, include_sections, agent_name, brokerage_name,
            )
        except Exception as exc:
            logger.error("claude_market_report_error", error=str(exc))

    return _market_report_from_template(
        area, date_range_start, date_range_end,
        property_type, include_sections, agent_name, brokerage_name,
    )


async def _market_report_with_claude(
    area: str,
    date_range_start: date,
    date_range_end: date,
    property_type: str | None,
    include_sections: list[str] | None,
    agent_name: str | None,
    brokerage_name: str | None,
) -> tuple[str, str, str]:
    """Generate market report via Claude."""
    sections_str = ", ".join(include_sections) if include_sections else "all"
    prompt = textwrap.dedent(f"""\
        Generate a real estate market report with the following parameters:

        Area: {area}
        Date range: {date_range_start.isoformat()} to {date_range_end.isoformat()}
        Property type filter: {property_type or 'All types'}
        Sections to include: {sections_str}
        Agent: {agent_name or 'N/A'}
        Brokerage: {brokerage_name or 'N/A'}

        Note: Use placeholder statistics since you do not have access to actual
        MLS data. Mark all statistics with [MLS DATA] so they can be replaced
        with real numbers before publication.

        Respond in exactly this format:
        TITLE: <report title>
        SUMMARY: <2-3 sentence executive summary>
        REPORT: <full report body with section headers>
    """)

    text = await _call_claude(MARKET_REPORT_SYSTEM_PROMPT, prompt)

    title = summary = report_body = ""
    if "TITLE:" in text:
        after_title = text.split("TITLE:", 1)[1]
        if "SUMMARY:" in after_title:
            title = after_title.split("SUMMARY:", 1)[0].strip()
        else:
            title = after_title.strip()

    if "SUMMARY:" in text:
        after_summary = text.split("SUMMARY:", 1)[1]
        if "REPORT:" in after_summary:
            summary = after_summary.split("REPORT:", 1)[0].strip()
        else:
            summary = after_summary.strip()

    if "REPORT:" in text:
        report_body = text.split("REPORT:", 1)[1].strip()

    return title, summary, report_body


def _market_report_from_template(
    area: str,
    date_range_start: date,
    date_range_end: date,
    property_type: str | None,
    include_sections: list[str] | None,
    agent_name: str | None,
    brokerage_name: str | None,
) -> tuple[str, str, str]:
    """Generate market report from templates with placeholder data."""
    prop_type_label = property_type or "Residential"
    date_range_str = f"{date_range_start.strftime('%B %Y')} - {date_range_end.strftime('%B %Y')}"
    sections = include_sections or [
        "overview", "pricing_trends", "inventory", "days_on_market", "forecast",
    ]

    title = f"{area} Real Estate Market Report: {date_range_str}"

    summary = (
        f"The {area} {prop_type_label.lower()} real estate market showed "
        f"steady activity during {date_range_str}. Key indicators suggest "
        f"a balanced market with opportunities for both buyers and sellers. "
        f"This report provides an overview of pricing trends, inventory "
        f"levels, and market velocity for the reporting period."
    )

    # Build report body section by section
    report_parts: list[str] = []

    if "overview" in sections:
        report_parts.append(textwrap.dedent(f"""\
            MARKET OVERVIEW
            ---------------
            The {area} real estate market experienced [MLS DATA: total transactions]
            closed transactions during {date_range_str}, representing a [MLS DATA: YoY
            change]% change compared to the same period last year. The overall market
            health index indicates a [MLS DATA: buyer's/seller's/balanced] market.

            Total closed volume: [MLS DATA: total volume]
            Average sale price: [MLS DATA: average price]
            Median sale price: [MLS DATA: median price]
            Sale-to-list price ratio: [MLS DATA: SP/LP ratio]%"""))

    if "pricing_trends" in sections:
        report_parts.append(textwrap.dedent(f"""\
            PRICING TRENDS
            --------------
            Average listing prices in {area} have [MLS DATA: increased/decreased] by
            [MLS DATA: price change]% over the reporting period. The median sale price
            of [MLS DATA: median price] reflects [MLS DATA: trend description].

            Price per square foot: [MLS DATA: price/sqft]
            Highest sale: [MLS DATA: highest sale price]
            Lowest sale: [MLS DATA: lowest sale price]
            Percentage of homes selling above list price: [MLS DATA: above list %]%"""))

    if "inventory" in sections:
        report_parts.append(textwrap.dedent(f"""\
            INVENTORY ANALYSIS
            ------------------
            Active inventory in {area} stands at [MLS DATA: active listings] listings,
            representing [MLS DATA: months of inventory] months of supply. New listings
            during the period totaled [MLS DATA: new listings], while [MLS DATA: expired]
            listings expired without selling.

            Active listings: [MLS DATA: count]
            New listings: [MLS DATA: count]
            Pending sales: [MLS DATA: count]
            Months of supply: [MLS DATA: months]"""))

    if "days_on_market" in sections:
        report_parts.append(textwrap.dedent(f"""\
            DAYS ON MARKET
            --------------
            The average days on market (DOM) in {area} is [MLS DATA: avg DOM] days,
            [MLS DATA: increase/decrease] from the previous period. Properties priced
            correctly for the market are selling in [MLS DATA: well-priced DOM] days
            on average.

            Average DOM: [MLS DATA: avg DOM] days
            Median DOM: [MLS DATA: median DOM] days
            Fastest sale: [MLS DATA: min DOM] days
            Properties over 90 days: [MLS DATA: over 90 count]"""))

    if "forecast" in sections:
        report_parts.append(textwrap.dedent(f"""\
            MARKET FORECAST
            ---------------
            Based on current trends and seasonal patterns, the {area} market is
            projected to [MLS DATA: forecast trend] over the coming quarter.
            Key factors to watch include mortgage rate movements, local employment
            trends, and new construction activity.

            NOTE: This forecast is based on historical patterns and current indicators.
            Actual market conditions may vary. This report does not constitute
            investment advice. All statistics should be verified with current MLS data
            before publication."""))

    report_body = "\n\n".join(report_parts)

    # Attribution
    if agent_name or brokerage_name:
        attribution_parts = []
        if agent_name:
            attribution_parts.append(f"Prepared by: {agent_name}")
        if brokerage_name:
            attribution_parts.append(f"Brokerage: {brokerage_name}")
        report_body += "\n\n---\n" + "\n".join(attribution_parts)

    return title, summary, report_body
