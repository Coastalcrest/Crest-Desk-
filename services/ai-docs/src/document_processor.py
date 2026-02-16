"""Document processing pipeline for AI-powered analysis.

Provides keyword-based template responses when no AI API key is configured,
and real Claude analysis when ANTHROPIC_API_KEY is set.
"""

from __future__ import annotations

import json
import structlog

from .config import settings
from .models import (
    ClassifyResponse,
    ComplianceCheckResponse,
    ExtractResponse,
    KeyValuePair,
    OCRPage,
    OCRResponse,
    Violation,
    DOCUMENT_TYPES,
)

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Anthropic client (lazy singleton)
# ---------------------------------------------------------------------------

_anthropic_client = None


def _get_anthropic_client():
    """Return an Anthropic client, or None when no key is configured."""
    global _anthropic_client
    api_key = getattr(settings, "anthropic_api_key", "") or ""
    if not api_key:
        return None
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
            _anthropic_client = Anthropic(api_key=api_key)
        except Exception as exc:
            logger.error("anthropic_client_init_failed", error=str(exc))
            return None
    return _anthropic_client


SYSTEM_PROMPT = (
    "You are an expert real estate document analyst with deep knowledge of US "
    "real estate transactions, federal laws (TILA, RESPA, Fair Housing, etc.), "
    "and all 50 state laws.\n\n"
    "When classifying documents, be precise about the document type and provide "
    "high-confidence scores only when certain.\n\n"
    "When extracting data, return ONLY valid JSON with the requested fields. "
    "If a field is not found, use null. Never fabricate data.\n\n"
    "When checking compliance, cite specific statutes or regulations when "
    "identifying compliance issues."
)

# ---------------------------------------------------------------------------
# Keyword maps for template-based (offline) processing
# ---------------------------------------------------------------------------

_KEYWORD_MAP: dict[str, list[str]] = {
    "purchase_agreement": [
        "purchase agreement", "purchase and sale", "buyer agrees to purchase",
        "offer to purchase", "sales contract", "purchase price",
    ],
    "seller_disclosure": [
        "seller disclosure", "property condition", "seller represents",
        "known defects", "seller warrants",
    ],
    "buyer_disclosure": [
        "buyer disclosure", "buyer acknowledges", "buyer represents",
    ],
    "inspection_report": [
        "inspection report", "home inspection", "property inspection",
        "inspector findings", "inspection date",
    ],
    "appraisal": [
        "appraisal report", "appraised value", "market value",
        "comparable sales", "appraisal date",
    ],
    "amendment": [
        "amendment to", "hereby amended", "modification of",
        "amend the following",
    ],
    "addendum": [
        "addendum to", "supplemental terms", "additional terms",
        "addendum attached",
    ],
    "counter_offer": [
        "counter offer", "counteroffer", "counter proposal",
        "seller counters",
    ],
    "lead_paint_disclosure": [
        "lead-based paint", "lead paint", "pre-1978",
        "lead hazard", "epa lead",
    ],
    "hoa_disclosure": [
        "homeowners association", "hoa disclosure", "hoa dues",
        "association fees", "cc&r",
    ],
    "earnest_money_receipt": [
        "earnest money", "good faith deposit", "deposit receipt",
        "escrow deposit",
    ],
    "title_insurance": [
        "title insurance", "title commitment", "title report",
        "title search", "preliminary title",
    ],
    "closing_disclosure": [
        "closing disclosure", "settlement statement", "hud-1",
        "closing costs", "settlement charges",
    ],
    "loan_application": [
        "loan application", "mortgage application", "uniform residential",
        "borrower information",
    ],
    "listing_agreement": [
        "listing agreement", "exclusive right to sell", "listing broker",
        "listing period",
    ],
    "agency_disclosure": [
        "agency disclosure", "agency relationship", "dual agency",
        "buyer's agent", "seller's agent",
    ],
    "deed": [
        "warranty deed", "quitclaim deed", "grant deed",
        "deed of trust", "bargain and sale",
    ],
}

_TEMPLATE_FIELDS: dict[str, dict[str, str | None]] = {
    "purchase_agreement": {
        "buyer_name": None,
        "seller_name": None,
        "property_address": None,
        "purchase_price": None,
        "closing_date": None,
        "earnest_money": None,
        "contingencies": None,
    },
    "seller_disclosure": {
        "seller_name": None,
        "property_address": None,
        "known_defects": None,
        "roof_condition": None,
        "plumbing_condition": None,
        "electrical_condition": None,
        "foundation_condition": None,
    },
    "deed": {
        "grantor": None,
        "grantee": None,
        "property_description": None,
        "recording_date": None,
        "deed_type": None,
    },
    "closing_disclosure": {
        "buyer_name": None,
        "seller_name": None,
        "property_address": None,
        "loan_amount": None,
        "interest_rate": None,
        "closing_costs": None,
        "cash_to_close": None,
    },
    "listing_agreement": {
        "seller_name": None,
        "listing_agent": None,
        "listing_broker": None,
        "property_address": None,
        "listing_price": None,
        "listing_period_start": None,
        "listing_period_end": None,
        "commission_rate": None,
    },
    "inspection_report": {
        "inspector_name": None,
        "inspection_date": None,
        "property_address": None,
        "overall_condition": None,
        "major_findings": None,
    },
}


# ---------------------------------------------------------------------------
# classify_document
# ---------------------------------------------------------------------------

async def classify_document(content: str, filename: str) -> ClassifyResponse:
    """Classify a document by type.

    Uses Claude when an API key is available, otherwise falls back to
    keyword-based heuristic classification.
    """
    client = _get_anthropic_client()
    if client is not None:
        return await _classify_with_ai(client, content, filename)
    return _classify_with_keywords(content, filename)


def _classify_with_keywords(content: str, filename: str) -> ClassifyResponse:
    """Keyword-based classification heuristic."""
    text_lower = (content + " " + filename).lower()
    best_type = "other"
    best_score = 0.0
    matched_categories: list[str] = []

    for doc_type, keywords in _KEYWORD_MAP.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits > 0:
            score = min(hits / max(len(keywords) * 0.5, 1), 1.0)
            matched_categories.append(doc_type)
            if score > best_score:
                best_score = score
                best_type = doc_type

    confidence = round(min(best_score, 0.95), 2)
    logger.info(
        "document_classified",
        document_type=best_type,
        confidence=confidence,
        mode="keyword",
    )
    return ClassifyResponse(
        document_type=best_type,
        confidence=confidence,
        categories=matched_categories,
        reasoning=f"Keyword-based classification matched '{best_type}'",
    )


async def _classify_with_ai(client, content: str, filename: str) -> ClassifyResponse:
    """Classify using Claude API."""
    type_list = ", ".join(DOCUMENT_TYPES)
    model = getattr(settings, "anthropic_model", "claude-sonnet-4-5-20250929")
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Classify this real estate document. Filename: {filename}\n\n"
                        f"Document text (first 3000 chars):\n{content[:3000]}\n\n"
                        f"Respond with ONLY valid JSON:\n"
                        f'{{"document_type": "<one of: {type_list}>", '
                        f'"confidence": <0.0-1.0>, '
                        f'"categories": ["<applicable category tags>"], '
                        f'"reasoning": "<brief explanation>"}}'
                    ),
                }
            ],
        )
        result = json.loads(response.content[0].text)
        logger.info(
            "document_classified",
            document_type=result.get("document_type"),
            confidence=result.get("confidence"),
            mode="ai",
        )
        return ClassifyResponse(**result)
    except Exception as exc:
        logger.error("ai_classification_failed", error=str(exc))
        return _classify_with_keywords(content, filename)


# ---------------------------------------------------------------------------
# extract_text
# ---------------------------------------------------------------------------

async def extract_text(content: str, filename: str, document_type: str | None = None) -> ExtractResponse:
    """Extract key-value pairs and fields from document text.

    Uses Claude when available, otherwise returns template fields based
    on the detected document type.
    """
    client = _get_anthropic_client()
    if client is not None:
        return await _extract_with_ai(client, content, document_type or "unknown")

    # Determine type if not provided
    if not document_type or document_type == "unknown":
        classification = _classify_with_keywords(content, filename)
        document_type = classification.document_type

    return _extract_with_template(content, document_type)


def _extract_with_template(content: str, document_type: str) -> ExtractResponse:
    """Return template key-value pairs based on document type."""
    template = _TEMPLATE_FIELDS.get(document_type, {
        "document_text": None,
        "parties": None,
        "date": None,
        "property_address": None,
    })

    kvps = [
        KeyValuePair(key=k, value=v, confidence=0.0)
        for k, v in template.items()
    ]

    logger.info("text_extracted", document_type=document_type, mode="template")
    return ExtractResponse(
        fields=dict(template),
        key_value_pairs=kvps,
        extraction_confidence=0.0,
        missing_fields=list(template.keys()),
    )


async def _extract_with_ai(client, content: str, document_type: str) -> ExtractResponse:
    """Extract fields using Claude API."""
    model = getattr(settings, "anthropic_model", "claude-sonnet-4-5-20250929")
    try:
        response = client.messages.create(
            model=model,
            max_tokens=getattr(settings, "max_tokens", 4096),
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Extract structured data from this {document_type} document.\n\n"
                        f"Document text:\n{content[:8000]}\n\n"
                        "Return ONLY valid JSON:\n"
                        '{"fields": {"<field_name>": "<value or null>"}, '
                        '"key_value_pairs": [{"key": "<k>", "value": "<v>", "confidence": <0-1>}], '
                        '"extraction_confidence": <0.0-1.0>, '
                        '"missing_fields": ["<field names not found>"]}'
                    ),
                }
            ],
        )
        result = json.loads(response.content[0].text)
        # Normalize key_value_pairs to KeyValuePair objects
        kvps = [KeyValuePair(**kv) for kv in result.get("key_value_pairs", [])]
        logger.info("text_extracted", document_type=document_type, mode="ai")
        return ExtractResponse(
            fields=result.get("fields", {}),
            key_value_pairs=kvps,
            extraction_confidence=result.get("extraction_confidence", 0.0),
            missing_fields=result.get("missing_fields", []),
        )
    except Exception as exc:
        logger.error("ai_extraction_failed", error=str(exc))
        return _extract_with_template(content, document_type)


# ---------------------------------------------------------------------------
# check_compliance
# ---------------------------------------------------------------------------

# Minimal offline compliance rules per state
_STATE_RULES: dict[str, list[dict[str, str]]] = {
    "OR": [
        {
            "rule_key": "or.disclosure.seller_property_condition",
            "check": "seller disclosure",
            "severity": "critical",
            "message": "Oregon requires seller property condition disclosure (ORS 93.275)",
            "statute": "ORS 93.275",
        },
        {
            "rule_key": "or.disclosure.lead_paint",
            "check": "lead-based paint",
            "severity": "critical",
            "message": "Lead-based paint disclosure required for pre-1978 properties (ORS 93.705)",
            "statute": "ORS 93.705",
        },
        {
            "rule_key": "or.earnest_money",
            "check": "earnest money",
            "severity": "warning",
            "message": "Earnest money provisions should be documented (ORS 93.027)",
            "statute": "ORS 93.027",
        },
    ],
    "WA": [
        {
            "rule_key": "wa.disclosure.seller",
            "check": "seller disclosure",
            "severity": "critical",
            "message": "Washington requires seller disclosure statement (RCW 64.06)",
            "statute": "RCW 64.06",
        },
    ],
    "CA": [
        {
            "rule_key": "ca.disclosure.transfer",
            "check": "transfer disclosure",
            "severity": "critical",
            "message": "California Transfer Disclosure Statement required (CC 1102)",
            "statute": "Cal. Civ. Code 1102",
        },
        {
            "rule_key": "ca.disclosure.natural_hazard",
            "check": "natural hazard",
            "severity": "critical",
            "message": "Natural Hazard Disclosure required (CC 1103)",
            "statute": "Cal. Civ. Code 1103",
        },
    ],
}

# Federal rules apply everywhere
_FEDERAL_RULES: list[dict[str, str]] = [
    {
        "rule_key": "federal.lead_paint",
        "check": "lead",
        "severity": "warning",
        "message": "Lead-based paint disclosure required for pre-1978 properties (42 USC 4852d)",
        "statute": "42 USC 4852d",
    },
    {
        "rule_key": "federal.fair_housing",
        "check": "fair housing",
        "severity": "info",
        "message": "Ensure compliance with Fair Housing Act - no discriminatory language",
        "statute": "42 USC 3601-3619",
    },
]


async def check_compliance(
    content: str, document_type: str, state: str
) -> ComplianceCheckResponse:
    """Check document for compliance with jurisdiction-specific rules.

    Uses Claude when available, otherwise applies keyword-based rule checks.
    """
    client = _get_anthropic_client()
    if client is not None:
        return await _compliance_with_ai(client, content, document_type, state)
    return _compliance_with_rules(content, document_type, state)


def _compliance_with_rules(
    content: str, document_type: str, state: str
) -> ComplianceCheckResponse:
    """Offline keyword-based compliance checking."""
    text_lower = content.lower()
    violations: list[Violation] = []
    warnings: list[str] = []
    suggestions: list[str] = []

    # Check state-specific rules
    state_rules = _STATE_RULES.get(state.upper(), [])
    for rule in state_rules:
        if rule["check"] not in text_lower:
            violations.append(
                Violation(
                    rule_key=rule["rule_key"],
                    severity=rule["severity"],
                    message=rule["message"],
                    statute=rule.get("statute"),
                )
            )

    # Check federal rules
    for rule in _FEDERAL_RULES:
        if rule["check"] not in text_lower:
            if rule["severity"] == "warning":
                warnings.append(rule["message"])
            else:
                suggestions.append(rule["message"])

    is_compliant = all(v.severity != "critical" for v in violations)

    logger.info(
        "compliance_checked",
        state=state,
        document_type=document_type,
        is_compliant=is_compliant,
        violation_count=len(violations),
        mode="rules",
    )
    return ComplianceCheckResponse(
        compliant=is_compliant,
        violations=violations,
        warnings=warnings,
        suggestions=suggestions,
        jurisdiction=state.upper(),
        document_type=document_type,
    )


async def _compliance_with_ai(
    client, content: str, document_type: str, state: str
) -> ComplianceCheckResponse:
    """Check compliance using Claude API."""
    model = getattr(settings, "anthropic_model", "claude-sonnet-4-5-20250929")
    try:
        response = client.messages.create(
            model=model,
            max_tokens=getattr(settings, "max_tokens", 4096),
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Check this {document_type} for compliance with {state} "
                        f"real estate laws.\n\n"
                        f"Document text:\n{content[:8000]}\n\n"
                        "Return ONLY valid JSON:\n"
                        '{"compliant": <true/false>, '
                        '"violations": [{"rule_key": "<key>", "severity": "<critical/warning/info>", '
                        '"message": "<desc>", "statute": "<ref or null>"}], '
                        '"warnings": ["<string>"], '
                        '"suggestions": ["<string>"], '
                        f'"jurisdiction": "{state}", '
                        f'"document_type": "{document_type}"}}'
                    ),
                }
            ],
        )
        result = json.loads(response.content[0].text)
        viol = [Violation(**v) for v in result.get("violations", [])]
        logger.info(
            "compliance_checked",
            state=state,
            document_type=document_type,
            is_compliant=result.get("compliant"),
            mode="ai",
        )
        return ComplianceCheckResponse(
            compliant=result.get("compliant", False),
            violations=viol,
            warnings=result.get("warnings", []),
            suggestions=result.get("suggestions", []),
            jurisdiction=result.get("jurisdiction", state),
            document_type=result.get("document_type", document_type),
        )
    except Exception as exc:
        logger.error("ai_compliance_failed", error=str(exc))
        return _compliance_with_rules(content, document_type, state)


# ---------------------------------------------------------------------------
# OCR processing (placeholder / text extraction)
# ---------------------------------------------------------------------------

async def process_ocr(content: str, filename: str) -> OCRResponse:
    """Process a document for OCR.

    In the current implementation this acts as a text-extraction pass.
    When pytesseract or a cloud OCR service is available the pipeline
    would swap in a real engine here.
    """
    # Treat incoming content as already-extracted text for now
    text = content.strip()
    is_scanned = len(text) < 50 and len(content) > 100

    pages = [
        OCRPage(page_number=1, text=text, confidence=0.85 if text else 0.0)
    ]
    overall_confidence = 0.85 if text else 0.0

    logger.info(
        "ocr_processed",
        filename=filename,
        text_length=len(text),
        is_scanned=is_scanned,
    )
    return OCRResponse(
        text=text,
        confidence=overall_confidence,
        pages=pages,
        page_count=1,
        is_scanned=is_scanned,
    )
