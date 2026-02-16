"""Unit tests for the AI Assist LLM client — tests template fallback.

When no ANTHROPIC_API_KEY is set (the normal test environment), the
``generate_response`` function falls back to keyword-based template
matching.  These tests verify that the template logic returns relevant,
non-empty responses for various topic keywords.
"""
import os

import pytest

from src.llm_client import generate_response, TEMPLATE_RESPONSES


# Ensure tests always exercise the template path, never the live API.
@pytest.fixture(autouse=True)
def _unset_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


@pytest.mark.asyncio
async def test_template_fallback_transaction_keywords():
    """When no API key, 'transaction' keyword should return the transaction template."""
    response = await generate_response(
        "How do I start a new transaction?",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    lower = response.lower()
    assert "transaction" in lower


@pytest.mark.asyncio
async def test_template_fallback_compliance_keywords():
    """'compliance' keyword should trigger the compliance template."""
    response = await generate_response(
        "What are the fair housing compliance requirements?",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    assert "compliance" in response.lower()


@pytest.mark.asyncio
async def test_template_fallback_document_keywords():
    """'document' keyword should trigger the document template."""
    response = await generate_response(
        "How do I upload a document?",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    assert "document" in response.lower()


@pytest.mark.asyncio
async def test_template_fallback_contact_keywords():
    """'contact' keyword should trigger the contact/CRM template."""
    response = await generate_response(
        "How do I add a new contact to my CRM?",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    assert "contact" in response.lower()


@pytest.mark.asyncio
async def test_template_fallback_billing_keywords():
    """'billing' keyword should trigger the billing/finance template."""
    response = await generate_response(
        "Where can I see my billing history?",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    assert "billing" in response.lower() or "finance" in response.lower()


@pytest.mark.asyncio
async def test_template_fallback_help_keyword():
    """'help' keyword should trigger the help template."""
    response = await generate_response(
        "I need help using this platform.",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 20
    assert "help" in response.lower() or "transaction" in response.lower()


@pytest.mark.asyncio
async def test_template_fallback_generic():
    """An unrelated topic should return the generic fallback response."""
    response = await generate_response(
        "Tell me about quantum physics.",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 10
    # Generic fallback mentions it can assist with CrestDesk features
    assert "help" in response.lower() or "crestdesk" in response.lower()


@pytest.mark.asyncio
async def test_empty_message():
    """Very short messages should still return a non-empty response."""
    response = await generate_response(
        "hi",
        conversation_history=[],
    )
    assert response is not None
    assert len(response) > 0


@pytest.mark.asyncio
async def test_context_page_overrides_keyword():
    """When context_page is set, it should take priority over message keywords."""
    response = await generate_response(
        "What is this page about?",
        conversation_history=[],
        context_page="/transactions/deal-001",
    )
    assert response is not None
    assert "transaction" in response.lower()


@pytest.mark.asyncio
async def test_template_responses_dict_is_populated():
    """Sanity check: TEMPLATE_RESPONSES should contain expected keys."""
    expected_keys = {"transaction", "contact", "document", "compliance", "billing", "help"}
    assert expected_keys.issubset(set(TEMPLATE_RESPONSES.keys()))


@pytest.mark.asyncio
async def test_conversation_history_accepted():
    """generate_response should accept conversation_history without error."""
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi! How can I help?"},
    ]
    response = await generate_response(
        "Tell me about documents.",
        conversation_history=history,
    )
    assert response is not None
    assert len(response) > 0
