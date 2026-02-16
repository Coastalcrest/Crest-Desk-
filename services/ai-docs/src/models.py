"""Pydantic models for the AI Docs service."""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

DOCUMENT_TYPES = [
    "purchase_agreement",
    "seller_disclosure",
    "buyer_disclosure",
    "inspection_report",
    "appraisal",
    "amendment",
    "addendum",
    "counter_offer",
    "lead_paint_disclosure",
    "hoa_disclosure",
    "earnest_money_receipt",
    "title_insurance",
    "closing_disclosure",
    "loan_application",
    "listing_agreement",
    "agency_disclosure",
    "deed",
    "other",
]


class ClassifyRequest(BaseModel):
    """Request body for document classification."""

    content: str = Field(..., description="Base64-encoded or plain-text document content")
    filename: str = Field("unknown.txt", description="Original filename for type hinting")


class ClassifyResponse(BaseModel):
    """Result of AI-powered document classification."""

    document_type: str = Field(..., description="Detected document type")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence")
    categories: list[str] = Field(default_factory=list, description="Applicable category tags")
    reasoning: str = Field("", description="Brief explanation of classification logic")


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

class ExtractRequest(BaseModel):
    """Request body for text/field extraction."""

    content: str = Field(..., description="Base64-encoded or plain-text document content")
    filename: str = Field("unknown.txt", description="Original filename")
    document_type: str | None = Field(None, description="Known document type to guide extraction")


class KeyValuePair(BaseModel):
    """A single extracted key-value pair from a document."""

    key: str
    value: str | None = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ExtractResponse(BaseModel):
    """Result of AI-powered field extraction."""

    fields: dict[str, str | None] = Field(default_factory=dict, description="Named fields extracted from the document")
    key_value_pairs: list[KeyValuePair] = Field(default_factory=list, description="All extracted key-value pairs")
    extraction_confidence: float = Field(0.0, ge=0.0, le=1.0)
    missing_fields: list[str] = Field(default_factory=list, description="Expected fields that were not found")


# ---------------------------------------------------------------------------
# Compliance
# ---------------------------------------------------------------------------

class ComplianceCheckRequest(BaseModel):
    """Request body for compliance checking."""

    content: str = Field(..., description="Base64-encoded or plain-text document content")
    document_type: str = Field("unknown", description="Document type for rule selection")
    state: str = Field("OR", description="US state abbreviation for jurisdiction rules")


class Violation(BaseModel):
    """A single compliance violation."""

    rule_key: str = Field(..., description="Machine-readable rule identifier")
    severity: str = Field("warning", description="critical | warning | info")
    message: str = Field(..., description="Human-readable violation description")
    statute: str | None = Field(None, description="Statute or regulation reference")


class ComplianceCheckResponse(BaseModel):
    """Result of compliance checking."""

    compliant: bool = Field(..., description="Whether the document passes all checks")
    violations: list[Violation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    jurisdiction: str = Field("", description="Jurisdiction used for checking")
    document_type: str = Field("", description="Document type that was checked")


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

class OCRRequest(BaseModel):
    """Request body for OCR processing."""

    content: str = Field(..., description="Base64-encoded image or PDF content")
    filename: str = Field("scan.png", description="Original filename")


class OCRPage(BaseModel):
    """OCR result for a single page."""

    page_number: int
    text: str
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class OCRResponse(BaseModel):
    """Result of OCR processing."""

    text: str = Field("", description="Full extracted text across all pages")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Overall OCR confidence")
    pages: list[OCRPage] = Field(default_factory=list, description="Per-page results")
    page_count: int = Field(0, description="Total pages processed")
    is_scanned: bool = Field(False, description="Whether the input appears to be a scanned document")
