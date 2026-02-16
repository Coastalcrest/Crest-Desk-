"""LLM client for AI Assist — Claude wrapper with fallback to template responses."""
import os
from typing import Any

import structlog

logger = structlog.get_logger()

# Try to import anthropic SDK
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    logger.info("anthropic SDK not installed — using template responses")


SYSTEM_PROMPT = """You are CrestAssist, an AI assistant for CrestDesk — a real estate transaction management platform used by brokerages, agents, and managing brokers.

You help users with:
- Navigating CrestDesk features (transactions, contacts, documents, compliance, billing)
- Understanding real estate terminology and processes
- Answering questions about compliance requirements (Fair Housing, RESPA, state-specific rules)
- Providing guidance on document management and e-signing workflows
- Explaining billing, commissions, and financial reports

Guidelines:
- Be concise and professional
- Reference specific CrestDesk features when applicable
- For compliance questions, always include a disclaimer that users should verify with their broker or legal counsel
- Never provide specific legal, tax, or financial advice
- If you don't know something, say so and suggest contacting support
"""

TEMPLATE_RESPONSES: dict[str, str] = {
    "transaction": "To manage transactions in CrestDesk, navigate to the Transactions section from your dashboard. You can create new transactions, track their status through the pipeline, manage documents, and monitor compliance requirements. Each transaction includes stages: Draft → Active → Under Contract → Closing → Closed.",
    "contact": "The Contacts section in CrestDesk lets you manage your client database. You can add contacts, tag them, track communication history, and set up automated follow-up sequences. Use the CRM Pipeline view to visualize your sales funnel.",
    "document": "CrestDesk's document management supports uploading, organizing, and e-signing documents. Navigate to Documents to see all files, use Forms for template-based document generation, and the Signing section for e-signature workflows. All documents are automatically checked for compliance.",
    "compliance": "CrestDesk includes built-in compliance checking for Fair Housing Act, CAN-SPAM, RESPA, and state-specific rules. Content is automatically scanned before publication. The Compliance section shows your compliance status and any required actions. Always consult your broker for specific compliance questions.",
    "billing": "The Finance section manages billing, commissions, and expenses. Managing brokers can generate invoices, track outstanding balances, and view agent commission structures. The Tax Prep report helps with year-end tax preparation.",
    "help": "I can help you with: transactions, contacts, documents, compliance, billing, social media, and general CrestDesk navigation. What would you like to know more about?",
}


async def generate_response(
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
    context_page: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Generate an AI response for the user's message.

    Uses Claude API if available, otherwise falls back to keyword-based templates.

    Args:
        message: User's message text.
        conversation_history: Previous messages for context.
        context_page: Current page the user is viewing.
        metadata: Additional context metadata.

    Returns:
        AI-generated response string.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if HAS_ANTHROPIC and api_key:
        return await _generate_with_claude(
            message, conversation_history, context_page, metadata
        )

    return _generate_template_response(message, context_page)


async def _generate_with_claude(
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
    context_page: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Generate response using Claude API."""
    try:
        client = anthropic.Anthropic()

        # Build messages from conversation history
        messages: list[dict[str, str]] = []
        if conversation_history:
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })

        # Add context about current page
        context_prefix = ""
        if context_page:
            context_prefix = f"[User is currently viewing: {context_page}] "

        messages.append({
            "role": "user",
            "content": f"{context_prefix}{message}",
        })

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        return response.content[0].text

    except Exception as exc:
        logger.error("claude_api_error", error=str(exc))
        # Fall back to template response
        return _generate_template_response(message, context_page)


def _generate_template_response(message: str, context_page: str | None = None) -> str:
    """Generate a response using keyword matching against templates."""
    lower_message = message.lower()

    # Check context page first
    if context_page:
        page_lower = context_page.lower()
        for key, response in TEMPLATE_RESPONSES.items():
            if key in page_lower:
                return response

    # Check message keywords
    for key, response in TEMPLATE_RESPONSES.items():
        if key in lower_message:
            return response

    # Default response
    return (
        "I'd be happy to help! I can assist with questions about transactions, "
        "contacts, documents, compliance, billing, and other CrestDesk features. "
        "Could you provide more details about what you need help with?"
    )
