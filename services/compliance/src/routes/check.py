"""Content compliance check endpoint."""
import structlog
from fastapi import APIRouter, HTTPException

from ..models import (
    BatchCheckRequest,
    BatchCheckResponse,
    ContentCheckRequest,
    ContentCheckResponse,
    ContentType,
)
from ..rules_engine import rules_engine

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["compliance-check"])


@router.post("/check", response_model=ContentCheckResponse)
async def check_content(request: ContentCheckRequest) -> ContentCheckResponse:
    """Check content against applicable compliance rules.

    Evaluates the provided content against:
    - Federal Fair Housing Act (42 U.S.C. § 3604)
    - CAN-SPAM Act (15 U.S.C. § 7704) for email content
    - State-specific advertising and disclosure rules
    - Equal Housing Opportunity requirements

    Returns compliance status, violations, and required insertions.
    """
    try:
        result = await rules_engine.check_content(
            content=request.content,
            content_type=request.content_type,
            state=request.state,
            metadata=request.metadata,
        )
        return result
    except Exception as exc:
        logger.error("compliance_check_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Compliance check failed") from exc


@router.post("/check/batch", response_model=BatchCheckResponse)
async def batch_check_content(request: BatchCheckRequest) -> BatchCheckResponse:
    """Check multiple content items for compliance in a single request.

    Processes up to 50 items per request. Each item is checked independently.
    """
    results: list[ContentCheckResponse] = []

    for item in request.items:
        try:
            result = await rules_engine.check_content(
                content=item.content,
                content_type=item.content_type,
                state=item.state,
                metadata=item.metadata,
            )
            results.append(result)
        except Exception as exc:
            logger.error("batch_check_item_error", error=str(exc))
            results.append(
                ContentCheckResponse(
                    compliant=False,
                    violations=[],
                    required_insertions=[],
                )
            )

    total_compliant = sum(1 for r in results if r.compliant)

    return BatchCheckResponse(
        results=results,
        total_compliant=total_compliant,
        total_non_compliant=len(results) - total_compliant,
    )
