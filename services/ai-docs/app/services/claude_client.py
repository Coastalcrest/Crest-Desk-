import structlog
from anthropic import Anthropic

from app.config import settings

log = structlog.get_logger()

_client: Anthropic | None = None


def get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


SYSTEM_PROMPT = """You are an expert real estate document analyst with deep knowledge of US real estate transactions, federal laws (TILA, RESPA, Fair Housing, etc.), and all 50 state laws.

When classifying documents, be precise about the document type and provide high-confidence scores only when certain.

When extracting data, return ONLY valid JSON with the requested fields. If a field is not found, use null. Never fabricate data.

When checking compliance, use your knowledge of state-specific requirements. For Oregon specifically, know:
- Lead-based paint disclosure required for pre-1978 properties (ORS 93.705)
- Seller property condition disclosure required (ORS 93.275)
- Earnest money required (ORS 93.027)
- Buyer right to inspect (common law)
- All disclosures must be acknowledged by both parties

Always cite specific statutes or regulations when identifying compliance issues."""


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
    "other",
]


async def classify_document(text: str, filename: str) -> dict:
    """Classify a real estate document using Claude."""
    client = get_client()
    type_list = ", ".join(DOCUMENT_TYPES)

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Classify this real estate document. The filename is: {filename}

Document text (first 3000 chars):
{text[:3000]}

Respond with ONLY valid JSON in this exact format:
{{"document_type": "<one of: {type_list}>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}}""",
            }
        ],
    )

    import json
    try:
        result = json.loads(response.content[0].text)
        log.info("document_classified", document_type=result.get("document_type"), confidence=result.get("confidence"))
        return result
    except json.JSONDecodeError:
        log.error("classification_parse_error", raw=response.content[0].text)
        return {"document_type": "other", "confidence": 0.0, "reasoning": "Failed to parse classification response"}


async def extract_data(text: str, document_type: str) -> dict:
    """Extract structured data from a real estate document using Claude."""
    client = get_client()

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Extract the following data from this {document_type} document.

Document text:
{text[:8000]}

Extract and return ONLY valid JSON with these fields:
{{
  "buyer_name": "<string or null>",
  "seller_name": "<string or null>",
  "property_address": "<string or null>",
  "purchase_price": <number or null>,
  "closing_date": "<YYYY-MM-DD or null>",
  "agent_names": ["<string>"],
  "terms": ["<string>"],
  "key_dates": {{}},
  "extraction_confidence": <0.0-1.0>,
  "missing_critical_fields": ["<field names that could not be found>"]
}}""",
            }
        ],
    )

    import json
    try:
        result = json.loads(response.content[0].text)
        log.info("data_extracted", document_type=document_type, confidence=result.get("extraction_confidence"))
        return result
    except json.JSONDecodeError:
        log.error("extraction_parse_error", raw=response.content[0].text)
        return {
            "buyer_name": None,
            "seller_name": None,
            "property_address": None,
            "purchase_price": None,
            "closing_date": None,
            "agent_names": [],
            "terms": [],
            "key_dates": {},
            "extraction_confidence": 0.0,
            "missing_critical_fields": ["all"],
        }


async def check_compliance(text: str, jurisdiction: str, document_type: str) -> dict:
    """Check document compliance against jurisdiction-specific rules."""
    client = get_client()

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"""Check this {document_type} document for compliance with {jurisdiction} real estate laws.

Document text:
{text[:8000]}

Check for:
1. All required disclosures present for {jurisdiction}
2. Required fields and signatures
3. State-specific requirements
4. Federal requirements (TILA, RESPA, Fair Housing, Lead Paint if applicable)

Return ONLY valid JSON:
{{
  "jurisdiction": "{jurisdiction}",
  "document_type": "{document_type}",
  "is_compliant": <true/false>,
  "violations": [
    {{
      "rule_key": "<jurisdiction.category.rule>",
      "severity": "<critical/warning/info>",
      "message": "<human-readable description>",
      "statute": "<statute reference if applicable>"
    }}
  ],
  "warnings": [
    {{
      "rule_key": "<key>",
      "message": "<description>"
    }}
  ],
  "suggestions": ["<improvement suggestions>"]
}}""",
            }
        ],
    )

    import json
    try:
        result = json.loads(response.content[0].text)
        log.info("compliance_checked", jurisdiction=jurisdiction, is_compliant=result.get("is_compliant"))
        return result
    except json.JSONDecodeError:
        log.error("compliance_parse_error", raw=response.content[0].text)
        return {
            "jurisdiction": jurisdiction,
            "document_type": document_type,
            "is_compliant": False,
            "violations": [{"rule_key": "parse_error", "severity": "warning", "message": "Could not parse compliance check results"}],
            "warnings": [],
            "suggestions": [],
        }
