"""FastAPI routes for AI-powered document processing."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..models import (
    ClassifyRequest,
    ClassifyResponse,
    ComplianceCheckRequest,
    ComplianceCheckResponse,
    ExtractRequest,
    ExtractResponse,
    OCRRequest,
    OCRResponse,
)
from ..document_processor import (
    classify_document,
    extract_text,
    check_compliance,
    process_ocr,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["documents"])


# ---------------------------------------------------------------------------
# POST /api/classify
# ---------------------------------------------------------------------------

@router.post("/classify", response_model=ClassifyResponse)
async def classify_endpoint(
    file: UploadFile | None = File(None),
    filename: str | None = Form(None),
    body: ClassifyRequest | None = None,
):
    """Classify an uploaded document by type.

    Accepts either a multipart file upload or a JSON body with content.
    """
    content, name = await _resolve_input(file, filename, body)
    if not content.strip():
        raise HTTPException(status_code=400, detail="No document content provided")

    logger.info("classify_request", filename=name)
    return await classify_document(content, name)


# ---------------------------------------------------------------------------
# POST /api/extract
# ---------------------------------------------------------------------------

@router.post("/extract", response_model=ExtractResponse)
async def extract_endpoint(
    file: UploadFile | None = File(None),
    filename: str | None = Form(None),
    document_type: str | None = Form(None),
    body: ExtractRequest | None = None,
):
    """Extract text and structured fields from a document."""
    content, name = await _resolve_input(file, filename, body)
    if not content.strip():
        raise HTTPException(status_code=400, detail="No document content provided")

    doc_type = document_type or (body.document_type if body else None)
    logger.info("extract_request", filename=name, document_type=doc_type)
    return await extract_text(content, name, doc_type)


# ---------------------------------------------------------------------------
# POST /api/compliance-check
# ---------------------------------------------------------------------------

@router.post("/compliance-check", response_model=ComplianceCheckResponse)
async def compliance_check_endpoint(
    file: UploadFile | None = File(None),
    document_type: str = Form("unknown"),
    state: str = Form("OR"),
    body: ComplianceCheckRequest | None = None,
):
    """Check a document for compliance with jurisdiction-specific rules."""
    content: str
    if body is not None:
        content = body.content
        document_type = body.document_type or document_type
        state = body.state or state
    elif file is not None:
        raw = await file.read()
        content = raw.decode("utf-8", errors="replace")
    else:
        raise HTTPException(status_code=400, detail="No document content provided")

    if not content.strip():
        raise HTTPException(status_code=400, detail="No document content provided")

    logger.info("compliance_check_request", document_type=document_type, state=state)
    return await check_compliance(content, document_type, state)


# ---------------------------------------------------------------------------
# POST /api/ocr
# ---------------------------------------------------------------------------

@router.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(
    file: UploadFile | None = File(None),
    filename: str | None = Form(None),
    body: OCRRequest | None = None,
):
    """OCR processing for scanned documents and images."""
    content, name = await _resolve_input(file, filename, body)
    if not content.strip():
        raise HTTPException(status_code=400, detail="No document content provided")

    logger.info("ocr_request", filename=name)
    return await process_ocr(content, name)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _resolve_input(
    file: UploadFile | None,
    filename: str | None,
    body: ClassifyRequest | ExtractRequest | OCRRequest | None,
) -> tuple[str, str]:
    """Extract content and filename from either file upload or JSON body."""
    if body is not None:
        return body.content, getattr(body, "filename", "unknown.txt")
    if file is not None:
        raw = await file.read()
        name = filename or file.filename or "unknown.txt"
        return raw.decode("utf-8", errors="replace"), name
    return "", "unknown.txt"
