"""Pydantic models for the AI Copilot service."""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ContextType(str, Enum):
    TRANSACTION = "transaction"
    CONTACT = "contact"
    DOCUMENT = "document"
    COMPLIANCE = "compliance"
    GENERAL = "general"


class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


# ---------- Request models ---------- #

class StartConversationRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    context_type: ContextType = ContextType.GENERAL
    context_id: str | None = None
    title: str | None = None


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class QueryRequest(BaseModel):
    """One-shot query (not saved to conversation history)."""
    query: str = Field(min_length=1, max_length=4000)
    context_type: ContextType = ContextType.GENERAL
    context_id: str | None = None


class FeedbackRequest(BaseModel):
    message_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


# ---------- Response models ---------- #

class Message(BaseModel):
    id: str
    role: MessageRole
    content: str
    content_type: str = "text"
    metadata: dict[str, Any] | None = None
    feedback_rating: int | None = None
    feedback_comment: str | None = None
    created_at: str


class Conversation(BaseModel):
    id: str
    title: str
    context_type: ContextType
    context_id: str | None = None
    message_count: int
    last_message_at: str | None = None
    created_at: str


class ConversationWithMessages(Conversation):
    messages: list[Message] = Field(default_factory=list)


class QueryResponse(BaseModel):
    response: str
    context_type: ContextType
    metadata: dict[str, Any] | None = None


class DealOverview(BaseModel):
    id: str
    property_address: str
    status: str
    purchase_price: str | None = None
    closing_date: str | None = None
    document_count: int = 0


class DealSummary(BaseModel):
    deal: dict[str, Any]
    transaction: dict[str, Any] | None = None
    compliance_status: str = "unknown"
    document_count: int = 0


class Deadline(BaseModel):
    transaction_id: str
    property_address: str
    closing_date: str
    days_remaining: int
    status: str


class Alert(BaseModel):
    id: str
    severity: AlertSeverity
    title: str
    description: str
    context_type: ContextType
    context_id: str | None = None
