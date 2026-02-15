import structlog
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from app.services.claude_client import extract_data
from app.services.pdf_processor import extract_text_from_pdf, extract_text_from_image

log = structlog.get_logger()
router = APIRouter()


class ExtractResponse(BaseModel):
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    property_address: Optional[str] = None
    purchase_price: Optional[float] = None
    closing_date: Optional[str] = None
    agent_names: list[str] = []
    terms: list[str] = []
    key_dates: dict = {}
    extraction_confidence: float = 0.0
    missing_critical_fields: list[str] = []


@router.post("/", response_model=ExtractResponse)
async def extract(
    file: UploadFile = File(...),
    document_type: str = Form("unknown"),
):
    """Extract structured data from a real estate document."""
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
        return ExtractResponse(missing_critical_fields=["all"])

    extracted = await extract_data(text, document_type)
    return ExtractResponse(**extracted)
