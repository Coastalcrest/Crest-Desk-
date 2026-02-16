"""AI Media generation endpoints."""
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from ..media_generator import generate_image, generate_social_graphic, generate_video
from ..models import (
    BatchGenerateRequest,
    BatchGenerateResponse,
    BatchItemResult,
    GenerateImageRequest,
    GenerateImageResponse,
    GenerateSocialRequest,
    GenerateSocialResponse,
    GenerateVideoRequest,
    GenerateVideoResponse,
    MediaStatus,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post("/image", response_model=dict[str, Any])
async def create_image(request: GenerateImageRequest):
    """Generate a listing photo or graphic.

    Uses DALL-E when an API key is configured, otherwise returns a
    placeholder URL for development.
    """
    logger.info(
        "image_generation_requested",
        style=request.style.value,
        width=request.dimensions.width,
        height=request.dimensions.height,
    )

    result = await generate_image(
        prompt=request.prompt,
        style=request.style.value,
        width=request.dimensions.width,
        height=request.dimensions.height,
    )

    response = GenerateImageResponse(
        id=result["id"],
        url=result["url"],
        prompt=request.prompt,
        style=request.style,
        width=result["width"],
        height=result["height"],
        provider=result["provider"],
        metadata=request.metadata,
        created_at=result["created_at"],
    )

    return {"data": response.model_dump()}


@router.post("/video", response_model=dict[str, Any])
async def create_video(request: GenerateVideoRequest):
    """Generate a property video.

    Currently returns placeholder URLs. Will integrate with a video
    generation provider in a future release.
    """
    logger.info(
        "video_generation_requested",
        property_address=request.property_address,
        style=request.style.value,
        duration=request.duration,
    )

    result = await generate_video(
        property_address=request.property_address,
        style=request.style.value,
        duration=request.duration,
    )

    response = GenerateVideoResponse(
        id=result["id"],
        url=result["url"],
        thumbnail_url=result["thumbnail_url"],
        property_address=request.property_address,
        style=request.style,
        duration=result["duration"],
        provider=result["provider"],
        metadata=request.metadata,
        created_at=result["created_at"],
    )

    return {"data": response.model_dump()}


@router.post("/social", response_model=dict[str, Any])
async def create_social_graphic(request: GenerateSocialRequest):
    """Generate a social media graphic.

    Produces platform-sized graphics using the specified template and
    style. Returns placeholder URLs until a template engine is integrated.
    """
    logger.info(
        "social_generation_requested",
        template=request.template,
        platform=request.platform.value,
        style=request.style.value,
    )

    result = await generate_social_graphic(
        template=request.template,
        text=request.text,
        platform=request.platform.value,
        style=request.style.value,
    )

    response = GenerateSocialResponse(
        id=result["id"],
        url=result["url"],
        template=request.template,
        text=request.text,
        platform=request.platform,
        style=request.style,
        width=result["width"],
        height=result["height"],
        provider=result["provider"],
        metadata=request.metadata,
        created_at=result["created_at"],
    )

    return {"data": response.model_dump()}


@router.post("/batch", response_model=dict[str, Any])
async def create_batch(request: BatchGenerateRequest):
    """Generate multiple media items in a single request.

    Accepts a list of items, each specifying type (image, video, social)
    and the relevant parameters. Returns results for every item.
    """
    from datetime import datetime, timezone
    from uuid import uuid4

    logger.info("batch_generation_requested", total_items=len(request.items))

    results: list[BatchItemResult] = []
    completed = 0
    failed = 0

    for idx, item in enumerate(request.items):
        try:
            if item.type == "image":
                prompt = item.prompt or "Professional real estate photo"
                width = item.width or 1024
                height = item.height or 1024
                gen = await generate_image(
                    prompt=prompt,
                    style=item.style.value,
                    width=width,
                    height=height,
                )
                results.append(
                    BatchItemResult(
                        index=idx,
                        type="image",
                        status=MediaStatus.COMPLETED,
                        url=gen["url"],
                        metadata={"provider": gen["provider"]},
                    )
                )
                completed += 1

            elif item.type == "video":
                address = item.property_address or "123 Main St"
                duration = item.duration or 30
                gen = await generate_video(
                    property_address=address,
                    style=item.style.value,
                    duration=duration,
                )
                results.append(
                    BatchItemResult(
                        index=idx,
                        type="video",
                        status=MediaStatus.COMPLETED,
                        url=gen["url"],
                        metadata={"provider": gen["provider"]},
                    )
                )
                completed += 1

            elif item.type == "social":
                template = item.template or "listing"
                text = item.text or "Check out this property!"
                platform = item.platform.value if item.platform else "instagram"
                gen = await generate_social_graphic(
                    template=template,
                    text=text,
                    platform=platform,
                    style=item.style.value,
                )
                results.append(
                    BatchItemResult(
                        index=idx,
                        type="social",
                        status=MediaStatus.COMPLETED,
                        url=gen["url"],
                        metadata={"provider": gen["provider"]},
                    )
                )
                completed += 1

            else:
                results.append(
                    BatchItemResult(
                        index=idx,
                        type=item.type,
                        status=MediaStatus.FAILED,
                        error=f"Unsupported media type: {item.type}",
                    )
                )
                failed += 1

        except Exception as exc:
            logger.exception(
                "batch_item_failed",
                index=idx,
                type=item.type,
            )
            results.append(
                BatchItemResult(
                    index=idx,
                    type=item.type,
                    status=MediaStatus.FAILED,
                    error=str(exc),
                )
            )
            failed += 1

    batch_id = str(uuid4())
    response = BatchGenerateResponse(
        id=batch_id,
        total=len(request.items),
        completed=completed,
        failed=failed,
        results=results,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    logger.info(
        "batch_generation_completed",
        batch_id=batch_id,
        total=len(request.items),
        completed=completed,
        failed=failed,
    )

    return {"data": response.model_dump()}
