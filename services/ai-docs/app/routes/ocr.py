import structlog
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from app.services.pdf_processor import extract_text_from_pdf, extract_text_from_image

log = structlog.get_logger()
router = APIRouter()


class OCRResponse(BaseModel):
    is_scanned: bool
    pages_processed: int = 0
    ocr_confidence: float = 0.0
    extracted_text: str = ""
    error: str | None = None


@router.post("/", response_model=OCRResponse)
async def ocr_document(file: UploadFile = File(...)):
    """OCR a scanned document to extract text."""
    file_bytes = await file.read()

    if file.content_type == "application/pdf" or (file.filename and file.filename.lower().endswith(".pdf")):
        result = extract_text_from_pdf(file_bytes)

        if result.get("is_scanned"):
            # PDF has no text layer — attempt OCR on each page image
            # For now, return what we have
            return OCRResponse(
                is_scanned=True,
                pages_processed=result["page_count"],
                ocr_confidence=0.5,
                extracted_text=result["text"],
                error=result.get("error"),
            )

        return OCRResponse(
            is_scanned=False,
            pages_processed=result["page_count"],
            ocr_confidence=0.95,
            extracted_text=result["text"],
        )

    elif file.content_type and file.content_type.startswith("image/"):
        result = extract_text_from_image(file_bytes)
        return OCRResponse(
            is_scanned=True,
            pages_processed=1,
            ocr_confidence=result.get("ocr_confidence", 0.0),
            extracted_text=result["text"],
            error=result.get("error"),
        )

    # Plain text fallback
    text = file_bytes.decode("utf-8", errors="replace")
    return OCRResponse(
        is_scanned=False,
        pages_processed=1,
        ocr_confidence=1.0,
        extracted_text=text,
    )
