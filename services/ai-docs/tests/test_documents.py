"""Tests for document processing endpoints (classify, extract, compliance-check, OCR)."""

import io
import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app


@pytest.fixture
def transport():
    return ASGITransport(app=app)


# ---------------------------------------------------------------------------
# Sample document content
# ---------------------------------------------------------------------------

PURCHASE_AGREEMENT_TEXT = """
REAL ESTATE PURCHASE AGREEMENT

This Purchase Agreement is entered into between John Smith ("Buyer")
and Jane Doe ("Seller") for the property located at 123 Oak Street,
Portland, OR 97201.

Purchase Price: $450,000.00
Earnest Money: $10,000.00
Closing Date: June 15, 2025

The Buyer agrees to purchase and the Seller agrees to sell the above
described property under the following terms and conditions.
"""

SELLER_DISCLOSURE_TEXT = """
SELLER PROPERTY CONDITION DISCLOSURE STATEMENT

Seller: Jane Doe
Property Address: 123 Oak Street, Portland, OR 97201

The seller disclosure includes the following known defects:
- Roof: Minor wear, last replaced 2015
- Plumbing: No known issues
- Electrical: Updated to code in 2018
- Foundation: No known issues

Lead-based paint: Property built in 1995 (post-1978, no lead paint disclosure required)
"""

GENERIC_TEXT = """
This is a generic document that does not match any real estate category.
It contains random text for testing the 'other' classification.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
"""


# ---------------------------------------------------------------------------
# POST /api/classify
# ---------------------------------------------------------------------------

class TestClassifyEndpoint:
    """Tests for the /api/classify endpoint."""

    @pytest.mark.asyncio
    async def test_classify_purchase_agreement_via_json(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "purchase_agreement.pdf",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "purchase_agreement"
        assert data["confidence"] > 0.0
        assert isinstance(data["categories"], list)

    @pytest.mark.asyncio
    async def test_classify_seller_disclosure(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                json={
                    "content": SELLER_DISCLOSURE_TEXT,
                    "filename": "disclosure.pdf",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "seller_disclosure"
        assert data["confidence"] > 0.0

    @pytest.mark.asyncio
    async def test_classify_generic_returns_other(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                json={"content": GENERIC_TEXT, "filename": "notes.txt"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "other"

    @pytest.mark.asyncio
    async def test_classify_via_file_upload(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                files={"file": ("agreement.txt", PURCHASE_AGREEMENT_TEXT.encode(), "text/plain")},
                data={"filename": "agreement.txt"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "purchase_agreement"

    @pytest.mark.asyncio
    async def test_classify_empty_content_returns_400(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                json={"content": "   ", "filename": "empty.txt"},
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_classify_response_has_reasoning(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/classify",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "test.pdf",
                },
            )
        data = response.json()
        assert "reasoning" in data


# ---------------------------------------------------------------------------
# POST /api/extract
# ---------------------------------------------------------------------------

class TestExtractEndpoint:
    """Tests for the /api/extract endpoint."""

    @pytest.mark.asyncio
    async def test_extract_returns_fields(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "purchase.pdf",
                    "document_type": "purchase_agreement",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "fields" in data
        assert "key_value_pairs" in data
        assert isinstance(data["fields"], dict)
        assert isinstance(data["key_value_pairs"], list)

    @pytest.mark.asyncio
    async def test_extract_without_document_type(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "purchase.pdf",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "fields" in data
        # Should auto-detect purchase_agreement and return its template fields
        assert "buyer_name" in data["fields"] or "purchase_price" in data["fields"]

    @pytest.mark.asyncio
    async def test_extract_has_missing_fields(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "test.pdf",
                    "document_type": "purchase_agreement",
                },
            )
        data = response.json()
        assert "missing_fields" in data
        assert isinstance(data["missing_fields"], list)

    @pytest.mark.asyncio
    async def test_extract_has_extraction_confidence(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "test.pdf",
                },
            )
        data = response.json()
        assert "extraction_confidence" in data
        assert isinstance(data["extraction_confidence"], float)

    @pytest.mark.asyncio
    async def test_extract_via_file_upload(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                files={"file": ("doc.txt", SELLER_DISCLOSURE_TEXT.encode(), "text/plain")},
                data={"document_type": "seller_disclosure"},
            )
        assert response.status_code == 200
        data = response.json()
        assert "fields" in data

    @pytest.mark.asyncio
    async def test_extract_empty_content_returns_400(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/extract",
                json={"content": "", "filename": "empty.txt"},
            )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/compliance-check
# ---------------------------------------------------------------------------

class TestComplianceCheckEndpoint:
    """Tests for the /api/compliance-check endpoint."""

    @pytest.mark.asyncio
    async def test_compliance_check_returns_result(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "compliant" in data
        assert isinstance(data["compliant"], bool)
        assert "violations" in data
        assert isinstance(data["violations"], list)

    @pytest.mark.asyncio
    async def test_compliance_check_detects_missing_disclosure(self, transport):
        # Document without seller disclosure language should trigger OR violation
        content = "This is a purchase agreement for a property. Purchase price: $500,000."
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": content,
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        data = response.json()
        assert data["compliant"] is False
        violation_keys = [v["rule_key"] for v in data["violations"]]
        assert any("or." in k for k in violation_keys)

    @pytest.mark.asyncio
    async def test_compliance_check_jurisdiction_field(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "document_type": "purchase_agreement",
                    "state": "CA",
                },
            )
        data = response.json()
        assert data["jurisdiction"] == "CA"

    @pytest.mark.asyncio
    async def test_compliance_check_has_suggestions(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        data = response.json()
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)

    @pytest.mark.asyncio
    async def test_compliance_check_has_warnings(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        data = response.json()
        assert "warnings" in data
        assert isinstance(data["warnings"], list)

    @pytest.mark.asyncio
    async def test_compliance_check_via_file_upload(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                files={"file": ("doc.txt", PURCHASE_AGREEMENT_TEXT.encode(), "text/plain")},
                data={"document_type": "purchase_agreement", "state": "OR"},
            )
        assert response.status_code == 200
        data = response.json()
        assert "compliant" in data

    @pytest.mark.asyncio
    async def test_compliance_check_empty_content_returns_400(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": "   ",
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_compliance_violation_has_severity(self, transport):
        content = "A simple document with no disclosures whatsoever."
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/compliance-check",
                json={
                    "content": content,
                    "document_type": "purchase_agreement",
                    "state": "OR",
                },
            )
        data = response.json()
        for violation in data["violations"]:
            assert "severity" in violation
            assert violation["severity"] in ("critical", "warning", "info")


# ---------------------------------------------------------------------------
# POST /api/ocr
# ---------------------------------------------------------------------------

class TestOCREndpoint:
    """Tests for the /api/ocr endpoint."""

    @pytest.mark.asyncio
    async def test_ocr_returns_text(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "scan.png",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 0

    @pytest.mark.asyncio
    async def test_ocr_returns_confidence(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "scan.png",
                },
            )
        data = response.json()
        assert "confidence" in data
        assert 0.0 <= data["confidence"] <= 1.0

    @pytest.mark.asyncio
    async def test_ocr_returns_pages(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "scan.pdf",
                },
            )
        data = response.json()
        assert "pages" in data
        assert isinstance(data["pages"], list)
        assert data["page_count"] >= 1

    @pytest.mark.asyncio
    async def test_ocr_page_has_structure(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "scan.png",
                },
            )
        data = response.json()
        if data["pages"]:
            page = data["pages"][0]
            assert "page_number" in page
            assert "text" in page
            assert "confidence" in page

    @pytest.mark.asyncio
    async def test_ocr_via_file_upload(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                files={"file": ("scan.png", PURCHASE_AGREEMENT_TEXT.encode(), "text/plain")},
            )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data

    @pytest.mark.asyncio
    async def test_ocr_empty_content_returns_400(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={"content": "  ", "filename": "empty.png"},
            )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_ocr_is_scanned_field(self, transport):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/ocr",
                json={
                    "content": PURCHASE_AGREEMENT_TEXT,
                    "filename": "scan.png",
                },
            )
        data = response.json()
        assert "is_scanned" in data
        assert isinstance(data["is_scanned"], bool)
