"""Content validation and pre-check endpoints."""
import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..models import ContentType, Severity

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["compliance-validate"])


class QuickValidateRequest(BaseModel):
    """Quick validation request for real-time content editing."""
    content: str = Field(min_length=1)
    content_type: ContentType


class QuickValidateResponse(BaseModel):
    """Quick validation result for real-time feedback."""
    has_issues: bool
    issue_count: int
    severity: Severity | None = None
    issues: list[str]


# Pre-compiled blocked terms for quick scanning (subset of most critical)
QUICK_SCAN_TERMS: dict[str, list[str]] = {
    "critical": [
        "no children", "adults only", "whites only", "no blacks",
        "no hispanics", "no asians", "english only", "citizen only",
        "american born", "no handicap", "crippled", "mentally ill",
    ],
    "warning": [
        "master bedroom", "bachelor pad", "man cave",
        "walking distance", "family friendly",
    ],
}


@router.post("/validate/quick", response_model=QuickValidateResponse)
async def quick_validate(request: QuickValidateRequest) -> QuickValidateResponse:
    """Quick content validation for real-time editing feedback.

    This is a lightweight check that only scans for the most critical
    Fair Housing violations without database lookups. Use POST /api/check
    for comprehensive compliance checking before publishing.
    """
    issues: list[str] = []
    max_severity: Severity | None = None
    lower_content = request.content.lower()

    # Check critical terms
    for term in QUICK_SCAN_TERMS["critical"]:
        if term in lower_content:
            issues.append(f'Critical: Contains prohibited term "{term}"')
            max_severity = Severity.CRITICAL

    # Check warning terms
    for term in QUICK_SCAN_TERMS["warning"]:
        if term in lower_content:
            issues.append(f'Warning: Term "{term}" may need review')
            if max_severity is None:
                max_severity = Severity.WARNING

    # CAN-SPAM check for emails
    if request.content_type == ContentType.EMAIL:
        if "unsubscribe" not in lower_content and "opt out" not in lower_content:
            issues.append("Email is missing unsubscribe mechanism")
            max_severity = max_severity or Severity.CRITICAL

    return QuickValidateResponse(
        has_issues=len(issues) > 0,
        issue_count=len(issues),
        severity=max_severity,
        issues=issues,
    )
