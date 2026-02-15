import structlog
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel

from app.services.claude_client import classify_document
from app.services.pdf_processor import extract_text_from_pdf, extract_text_from_image

log = structlog.get_logger()
router = APIRouter()


class ClassifyResponse(BaseModel):
    document_type: str
    confidence: float
    reasoning: str


@router.post("/", response_model=ClassifyResponse)
async def classify(
    file: UploadFile = File(...),
    filename: str = Form(None),
):
    """Classify a real estate document using AI."""
    file_bytes = await file.read()
    name = filename or file.filename or "unknown"

    # Extract text based on file type
    if file.content_type == "application/pdf" or name.lower().endswith(".pdf"):
        result = extract_text_from_pdf(file_bytes)
        text = result["text"]
    elif file.content_type and file.content_type.startswith("image/"):
        result = extract_text_from_image(file_bytes)
        text = result["text"]
    else:
        text = file_bytes.decode("utf-8", errors="replace")

    if not text.strip():
        return ClassifyResponse(
            document_type="other",
            confidence=0.0,
            reasoning="Could not extract text from document",
        )

    classification = await classify_document(text, name)
    return ClassifyResponse(**classification)
