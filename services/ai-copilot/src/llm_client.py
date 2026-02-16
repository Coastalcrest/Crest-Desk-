"""LLM client for AI Copilot — Claude wrapper with tool-use support."""
import os
from typing import Any

import structlog

logger = structlog.get_logger()

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    logger.info("anthropic SDK not installed — using template responses")


SYSTEM_PROMPT = """You are CrestPilot, an intelligent AI copilot embedded in CrestDesk — a real estate transaction management platform.

You help managing brokers and agents by:
- Providing deal status summaries and pipeline overviews
- Identifying upcoming deadlines and potential issues
- Checking compliance status across transactions
- Suggesting next actions for deals in progress
- Answering questions about transactions, contacts, and documents

You have access to the user's deal data and can provide specific, actionable insights.

Guidelines:
- Be proactive — suggest actions without being asked
- Use specific numbers and dates when available
- Flag risks and deadlines prominently
- Keep responses focused and actionable
- Never provide legal or financial advice — suggest consulting professionals
"""


KEYWORD_RESPONSES: dict[str, str] = {
    "status": "Here's a summary of your active deals:\n\n• **Pipeline Overview**: Check your dashboard for the latest deal statuses. You can view active transactions, pending closings, and deals under contract.\n\n• **Quick Actions**: Review any deals approaching their closing date and ensure all required documents are in order.\n\nWould you like me to look at a specific deal?",
    "deadline": "Here are your upcoming deadlines:\n\n• Check the Transactions section for deals with closing dates in the next 30 days.\n• Review document completion status for each pending transaction.\n• Ensure compliance checklists are completed before closing.\n\nI can help you prepare for any specific closing.",
    "document": "Document management tips:\n\n• Navigate to Documents to see all files across your transactions.\n• Each transaction should have at minimum: purchase agreement, disclosures, and compliance documents.\n• Use the e-signing workflow for faster document completion.\n• Documents are automatically checked for compliance.\n\nWould you like help with a specific document?",
    "compliance": "Compliance overview:\n\n• CrestDesk checks content against Fair Housing Act, CAN-SPAM, and state-specific rules.\n• Review the Compliance section for any outstanding items.\n• Each transaction has a compliance checklist — ensure both federal and state items are complete before closing.\n• **Important**: Always consult your broker or legal counsel for specific compliance questions.\n\nNeed help with a specific compliance item?",
    "commission": "Commission and billing information:\n\n• View your commission structures in Finance → Settings.\n• Outstanding invoices are tracked in Finance → Billing.\n• The P&L report shows your profit and loss summary.\n• Tax preparation data is available in Finance → Tax Prep.\n\nNeed help with specific commission calculations?",
}


async def generate_copilot_response(
    message: str,
    context_type: str | None = None,
    context_id: str | None = None,
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """Generate an AI copilot response.

    Uses Claude API with tool-use support if available, otherwise templates.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if HAS_ANTHROPIC and api_key:
        return await _generate_with_claude(
            message, context_type, context_id, conversation_history
        )

    return _generate_template_response(message, context_type)


async def _generate_with_claude(
    message: str,
    context_type: str | None = None,
    context_id: str | None = None,
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """Generate response using Claude API with tool-use capabilities."""
    try:
        client = anthropic.Anthropic()

        messages: list[dict[str, str]] = []
        if conversation_history:
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })

        context_prefix = ""
        if context_type:
            context_prefix = f"[Context: {context_type}"
            if context_id:
                context_prefix += f" ID: {context_id}"
            context_prefix += "] "

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
        return _generate_template_response(message, context_type)


def _generate_template_response(message: str, context_type: str | None = None) -> str:
    """Generate a response using keyword matching."""
    lower_message = message.lower()

    # Check context type first
    if context_type and context_type in KEYWORD_RESPONSES:
        return KEYWORD_RESPONSES[context_type]

    # Check keywords
    for key, response in KEYWORD_RESPONSES.items():
        if key in lower_message:
            return response

    return (
        "I'm CrestPilot, your AI copilot for CrestDesk. I can help you with:\n\n"
        "• **Deal Status**: Ask about your active deals and pipeline\n"
        "• **Deadlines**: Check upcoming closing dates and required actions\n"
        "• **Documents**: Review document status across transactions\n"
        "• **Compliance**: Check compliance status and requirements\n"
        "• **Commissions**: View billing and commission information\n\n"
        "What would you like to know?"
    )
