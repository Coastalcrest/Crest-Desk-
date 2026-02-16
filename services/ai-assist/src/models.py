"""Pydantic models for the AI Assist service."""
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


# ---------- Request models ---------- #

class StartConversationRequest(BaseModel):
    """Start a new AI assist conversation."""
    message: str = Field(min_length=1, max_length=4000)
    context_page: str | None = None
    context_metadata: dict[str, Any] | None = None


class SendMessageRequest(BaseModel):
    """Send a message in an existing conversation."""
    message: str = Field(min_length=1, max_length=4000)


class ArticleFeedbackRequest(BaseModel):
    """Submit feedback on a help article."""
    helpful: bool


class EscalateRequest(BaseModel):
    """Escalate conversation to support ticket."""
    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)


class SearchQuery(BaseModel):
    """Search query for help articles."""
    q: str = Field(min_length=1, max_length=200)
    category: str | None = None
    feature_area: str | None = None


# ---------- Response models ---------- #

class Message(BaseModel):
    """A single message in a conversation."""
    id: str
    role: MessageRole
    content: str
    content_type: str = "text"
    metadata: dict[str, Any] | None = None
    created_at: str


class Conversation(BaseModel):
    """AI assist conversation."""
    id: str
    title: str
    status: ConversationStatus
    context_page: str | None = None
    message_count: int
    last_message_at: str | None = None
    created_at: str


class ConversationWithMessages(Conversation):
    """Conversation with full message history."""
    messages: list[Message] = Field(default_factory=list)


class HelpArticle(BaseModel):
    """Help article from the knowledge base."""
    id: str
    slug: str
    title: str
    summary: str
    content: str
    category: str
    feature_area: str
    tags: list[str] = Field(default_factory=list)
    view_count: int = 0
    helpful_count: int = 0
    not_helpful_count: int = 0


class ContextHelp(BaseModel):
    """Contextual help for a specific page."""
    page: str
    articles: list[HelpArticle]
    suggestions: list[str]
