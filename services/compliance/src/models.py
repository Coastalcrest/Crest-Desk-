"""Pydantic models for the compliance service API."""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ContentType(str, Enum):
    """Supported content types for compliance checking."""
    SOCIAL_POST = "social_post"
    LISTING_IMAGE = "listing_image"
    EMAIL = "email"
    DOCUMENT = "document"
    VIDEO = "video"


class EnforcementLevel(str, Enum):
    """How a rule is enforced."""
    BLOCK = "block"
    WARN = "warn"
    REQUIRE = "require"
    INSERT = "insert"


class Severity(str, Enum):
    """Violation severity level."""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class InsertionPosition(str, Enum):
    """Where to insert required content."""
    PREPEND = "prepend"
    APPEND = "append"
    FOOTER = "footer"


# ---------- Request models ---------- #

class ContentCheckRequest(BaseModel):
    """Request to check content for compliance."""
    content: str = Field(min_length=1, description="Text content to check")
    content_type: ContentType = Field(description="Type of content being checked")
    state: str = Field(min_length=2, max_length=2, description="Two-letter US state code")
    metadata: dict[str, Any] | None = Field(default=None, description="Additional context")

    def model_post_init(self, __context: Any) -> None:
        """Normalize state code to uppercase."""
        object.__setattr__(self, "state", self.state.upper())


class RulesQueryParams(BaseModel):
    """Query parameters for listing rules."""
    jurisdiction: str | None = None
    category: str | None = None


class BatchCheckRequest(BaseModel):
    """Batch compliance check for multiple content items."""
    items: list[ContentCheckRequest] = Field(min_length=1, max_length=50)


# ---------- Response models ---------- #

class Violation(BaseModel):
    """A compliance violation found in content."""
    rule_key: str
    severity: Severity
    message: str
    jurisdiction: str
    enforcement: EnforcementLevel


class RequiredInsertion(BaseModel):
    """Content that must be inserted to comply with rules."""
    element: str
    content: str
    position: InsertionPosition
    jurisdiction: str


class ContentCheckResponse(BaseModel):
    """Result of a compliance check."""
    compliant: bool
    violations: list[Violation] = Field(default_factory=list)
    required_insertions: list[RequiredInsertion] = Field(default_factory=list)


class BatchCheckResponse(BaseModel):
    """Results of batch compliance check."""
    results: list[ContentCheckResponse]
    total_compliant: int
    total_non_compliant: int


class ComplianceRuleResponse(BaseModel):
    """A compliance rule from the database."""
    id: str
    jurisdiction: str
    category: str
    subcategory: str
    rule_key: str
    title: str
    description: str
    enforcement: EnforcementLevel
    parameters: dict[str, Any]
    applies_to: list[str]
    effective_date: str
    superseded_date: str | None = None
    version: int
    source_reference: str | None = None


class StateRulesResponse(BaseModel):
    """Federal and state rules for a jurisdiction."""
    federal: list[ComplianceRuleResponse]
    state: list[ComplianceRuleResponse]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    database: str = "unknown"
    rules_loaded: int = 0
