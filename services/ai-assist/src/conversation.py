"""Conversation management — context window and history tracking."""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import structlog

from .models import (
    Conversation,
    ConversationStatus,
    ConversationWithMessages,
    Message,
    MessageRole,
)

logger = structlog.get_logger()

# In-memory store (replace with database in production when service owns data)
_conversations: dict[str, dict[str, Any]] = {}
_messages: dict[str, list[dict[str, Any]]] = {}


def create_conversation(
    user_id: str,
    tenant_id: str,
    title: str,
    context_page: str | None = None,
    context_metadata: dict[str, Any] | None = None,
) -> Conversation:
    """Create a new conversation."""
    conv_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conv = {
        "id": conv_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "title": title,
        "status": ConversationStatus.ACTIVE,
        "context_page": context_page,
        "context_metadata": context_metadata,
        "message_count": 0,
        "last_message_at": None,
        "created_at": now,
    }
    _conversations[conv_id] = conv
    _messages[conv_id] = []

    logger.info("conversation_created", conversation_id=conv_id, user_id=user_id)
    return Conversation(**{k: v for k, v in conv.items() if k in Conversation.model_fields})


def add_message(
    conversation_id: str,
    role: MessageRole,
    content: str,
    content_type: str = "text",
    metadata: dict[str, Any] | None = None,
) -> Message:
    """Add a message to a conversation."""
    if conversation_id not in _conversations:
        raise ValueError(f"Conversation {conversation_id} not found")

    msg_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    msg = {
        "id": msg_id,
        "role": role,
        "content": content,
        "content_type": content_type,
        "metadata": metadata,
        "created_at": now,
    }
    _messages[conversation_id].append(msg)

    # Update conversation
    conv = _conversations[conversation_id]
    conv["message_count"] = len(_messages[conversation_id])
    conv["last_message_at"] = now

    return Message(**msg)


def get_conversation(conversation_id: str) -> ConversationWithMessages | None:
    """Get a conversation with all messages."""
    conv = _conversations.get(conversation_id)
    if not conv:
        return None

    messages = [Message(**m) for m in _messages.get(conversation_id, [])]
    return ConversationWithMessages(
        **{k: v for k, v in conv.items() if k in ConversationWithMessages.model_fields},
        messages=messages,
    )


def list_conversations(
    user_id: str,
    tenant_id: str,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Conversation], int]:
    """List conversations for a user."""
    user_convs = [
        c for c in _conversations.values()
        if c["user_id"] == user_id and c["tenant_id"] == tenant_id
    ]
    user_convs.sort(key=lambda c: c["created_at"], reverse=True)

    total = len(user_convs)
    offset = (page - 1) * limit
    page_convs = user_convs[offset:offset + limit]

    return [
        Conversation(**{k: v for k, v in c.items() if k in Conversation.model_fields})
        for c in page_convs
    ], total


def get_conversation_history(conversation_id: str) -> list[dict[str, str]]:
    """Get message history formatted for LLM context."""
    msgs = _messages.get(conversation_id, [])
    return [
        {"role": m["role"].value if isinstance(m["role"], MessageRole) else m["role"], "content": m["content"]}
        for m in msgs
    ]


def escalate_conversation(conversation_id: str) -> bool:
    """Mark a conversation as escalated."""
    conv = _conversations.get(conversation_id)
    if not conv:
        return False
    conv["status"] = ConversationStatus.ESCALATED
    logger.info("conversation_escalated", conversation_id=conversation_id)
    return True
