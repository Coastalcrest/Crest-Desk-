import io
import structlog
from pypdf import PdfReader

log = structlog.get_logger()


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        full_text = []

        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_text.append({"page": i + 1, "text": text})
            full_text.append(text)

        combined_text = "\n\n".join(full_text)
        is_scanned = len(combined_text.strip()) < 50 and len(reader.pages) > 0

        log.info(
            "pdf_text_extracted",
            pages=len(reader.pages),
            text_length=len(combined_text),
            is_scanned=is_scanned,
        )

        return {
            "text": combined_text,
            "pages": pages_text,
            "page_count": len(reader.pages),
            "is_scanned": is_scanned,
        }
    except Exception as e:
        log.error("pdf_extraction_error", error=str(e))
        return {
            "text": "",
            "pages": [],
            "page_count": 0,
            "is_scanned": True,
            "error": str(e),
        }


def extract_text_from_image(file_bytes: bytes) -> dict:
    """Extract text from an image using OCR (pytesseract)."""
    try:
        from PIL import Image
        import pytesseract

        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)

        log.info("image_ocr_complete", text_length=len(text))

        return {
            "text": text,
            "is_scanned": True,
            "ocr_confidence": 0.85,  # Placeholder — real confidence from pytesseract data
        }
    except ImportError:
        log.warning("pytesseract_not_available")
        return {
            "text": "",
            "is_scanned": True,
            "ocr_confidence": 0.0,
            "error": "pytesseract not installed or Tesseract binary not found",
        }
    except Exception as e:
        log.error("image_ocr_error", error=str(e))
        return {
            "text": "",
            "is_scanned": True,
            "ocr_confidence": 0.0,
            "error": str(e),
        }
