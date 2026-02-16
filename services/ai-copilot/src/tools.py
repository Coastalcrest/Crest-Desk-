"""Tool definitions for the AI Copilot agent loop.

These tools describe actions the copilot can take when using Claude with tool-use.
In template mode, these definitions are not used.
"""
from typing import Any

COPILOT_TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_contacts",
        "description": "Search the user's contacts by name, email, or phone number.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for contact name, email, or phone",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_transaction",
        "description": "Look up a specific real estate transaction by ID or property address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "transaction_id": {
                    "type": "string",
                    "description": "UUID of the transaction",
                },
                "property_address": {
                    "type": "string",
                    "description": "Property address to search for",
                },
            },
        },
    },
    {
        "name": "check_compliance",
        "description": "Check compliance status for a transaction or piece of content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "Content to check for compliance",
                },
                "content_type": {
                    "type": "string",
                    "enum": ["social_post", "email", "document", "listing_image", "video"],
                    "description": "Type of content",
                },
                "state": {
                    "type": "string",
                    "description": "Two-letter US state code",
                },
            },
            "required": ["content", "content_type", "state"],
        },
    },
    {
        "name": "draft_email",
        "description": "Draft an email to a contact related to a transaction.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Recipient email address",
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line",
                },
                "context": {
                    "type": "string",
                    "description": "Context for generating the email body",
                },
                "tone": {
                    "type": "string",
                    "enum": ["professional", "friendly", "formal"],
                    "default": "professional",
                },
            },
            "required": ["to", "subject", "context"],
        },
    },
    {
        "name": "list_upcoming_deadlines",
        "description": "List upcoming transaction deadlines within a specified number of days.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Number of days to look ahead",
                    "default": 30,
                },
            },
        },
    },
]
