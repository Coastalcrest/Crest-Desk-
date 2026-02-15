import structlog
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel

from app.services.claude_client import check_compliance
from app.services.pdf_processor import extract_text_from_pdf, extract_text_from_image

log = structlog.get_logger()
router = APIRouter()


class Violation(BaseModel):
    rule_key: str
    severity: str
    message: str
    statute: str | None = None


class Warning(BaseModel):
    rule_key: str
    message: str


class ComplianceResponse(BaseModel):
    jurisdiction: str
    document_type: str
    is_compliant: bool
    violations: list[Violation] = []
    warnings: list[Warning] = []
    suggestions: list[str] = []


@router.post("/check", response_model=ComplianceResponse)
async def check_document_compliance(
    file: UploadFile = File(...),
    jurisdiction: str = Form(...),
    document_type: str = Form("unknown"),
):
    """Check a document for compliance with jurisdiction-specific rules."""
    file_bytes = await file.read()

    if file.content_type == "application/pdf" or (file.filename and file.filename.lower().endswith(".pdf")):
        result = extract_text_from_pdf(file_bytes)
        text = result["text"]
    elif file.content_type and file.content_type.startswith("image/"):
        result = extract_text_from_image(file_bytes)
        text = result["text"]
    else:
        text = file_bytes.decode("utf-8", errors="replace")

    if not text.strip():
        return ComplianceResponse(
            jurisdiction=jurisdiction,
            document_type=document_type,
            is_compliant=False,
            violations=[Violation(rule_key="no_text", severity="critical", message="Could not extract text from document for compliance checking")],
        )

    result = await check_compliance(text, jurisdiction, document_type)
    return ComplianceResponse(**result)
