"""AI Copilot conversation and intelligence endpoints."""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import structlog
from fastapi import APIRouter, HTTPException

from ..agent import get_alerts, get_deal_summary, get_deals_overview, get_upcoming_deadlines
from ..llm_client import generate_copilot_response
from ..models import (
    ConversationWithMessages,
    FeedbackRequest,
    Message,
    MessageRole,
    QueryRequest,
    QueryResponse,
    SendMessageRequest,
    StartConversationRequest,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["copilot"])

# In-memory store
_conversations: dict[str, dict[str, Any]] = {}
_messages: dict[str, list[dict[str, Any]]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/copilot")
async def list_conversations(page: int = 1, limit: int = 20):
    """List copilot conversations."""
    convs = sorted(_conversations.values(), key=lambda c: c["created_at"], reverse=True)
    total = len(convs)
    offset = (page - 1) * limit
    page_convs = convs[offset:offset + limit]

    return {
        "data": page_convs,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
    }


@router.post("/copilot", status_code=201)
async def start_conversation(request: StartConversationRequest):
    """Start a new copilot conversation."""
    conv_id = str(uuid4())
    now = _now_iso()
    title = request.title or (request.message[:50] + ("..." if len(request.message) > 50 else ""))

    conv = {
        "id": conv_id,
        "title": title,
        "context_type": request.context_type.value,
        "context_id": request.context_id,
        "message_count": 0,
        "last_message_at": None,
        "created_at": now,
    }
    _conversations[conv_id] = conv
    _messages[conv_id] = []

    # Add user message
    user_msg = {"id": str(uuid4()), "role": "user", "content": request.message, "content_type": "text", "metadata": None, "feedback_rating": None, "feedback_comment": None, "created_at": now}
    _messages[conv_id].append(user_msg)

    # Generate response
    history = [{"role": m["role"], "content": m["content"]} for m in _messages[conv_id]]
    response_text = await generate_copilot_response(
        message=request.message,
        context_type=request.context_type.value,
        context_id=request.context_id,
        conversation_history=history,
    )

    assistant_msg = {"id": str(uuid4()), "role": "assistant", "content": response_text, "content_type": "text", "metadata": None, "feedback_rating": None, "feedback_comment": None, "created_at": _now_iso()}
    _messages[conv_id].append(assistant_msg)

    conv["message_count"] = len(_messages[conv_id])
    conv["last_message_at"] = _now_iso()

    return {"data": {**conv, "messages": _messages[conv_id]}}


@router.get("/copilot/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a copilot conversation with messages."""
    conv = _conversations.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"data": {**conv, "messages": _messages.get(conversation_id, [])}}


@router.post("/copilot/{conversation_id}/messages")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """Send a message in a copilot conversation."""
    conv = _conversations.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = _now_iso()
    user_msg = {"id": str(uuid4()), "role": "user", "content": request.message, "content_type": "text", "metadata": None, "feedback_rating": None, "feedback_comment": None, "created_at": now}
    _messages[conversation_id].append(user_msg)

    history = [{"role": m["role"], "content": m["content"]} for m in _messages[conversation_id]]
    response_text = await generate_copilot_response(
        message=request.message,
        context_type=conv.get("context_type"),
        context_id=conv.get("context_id"),
        conversation_history=history,
    )

    assistant_msg = {"id": str(uuid4()), "role": "assistant", "content": response_text, "content_type": "text", "metadata": None, "feedback_rating": None, "feedback_comment": None, "created_at": _now_iso()}
    _messages[conversation_id].append(assistant_msg)

    conv["message_count"] = len(_messages[conversation_id])
    conv["last_message_at"] = _now_iso()

    return {"data": {"user_message": user_msg, "assistant_message": assistant_msg}}


@router.delete("/copilot/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    """Soft delete a copilot conversation."""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    del _conversations[conversation_id]
    _messages.pop(conversation_id, None)


@router.post("/copilot/query")
async def one_shot_query(request: QueryRequest):
    """One-shot query — not saved to conversation history."""
    response_text = await generate_copilot_response(
        message=request.query,
        context_type=request.context_type.value,
        context_id=request.context_id,
    )
    return {"data": QueryResponse(response=response_text, context_type=request.context_type).model_dump()}


@router.get("/copilot/deals/overview")
async def deals_overview():
    """Get overview of all active deals."""
    deals = get_deals_overview()
    return {"data": [d.model_dump() for d in deals]}


@router.get("/copilot/deals/{deal_id}/summary")
async def deal_summary(deal_id: str):
    """Get summary of a specific deal."""
    summary = get_deal_summary(deal_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"data": summary.model_dump()}


@router.get("/copilot/deadlines")
async def upcoming_deadlines(days: int = 30):
    """Get upcoming transaction deadlines."""
    deadlines = get_upcoming_deadlines(days)
    return {"data": [d.model_dump() for d in deadlines]}


@router.get("/copilot/alerts")
async def get_proactive_alerts():
    """Get proactive alerts about deals, deadlines, and compliance."""
    alerts = get_alerts()
    return {"data": [a.model_dump() for a in alerts]}


@router.post("/copilot/{conversation_id}/feedback")
async def submit_feedback(conversation_id: str, request: FeedbackRequest):
    """Rate a copilot message."""
    msgs = _messages.get(conversation_id, [])
    msg = next((m for m in msgs if m["id"] == request.message_id), None)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg["feedback_rating"] = request.rating
    msg["feedback_comment"] = request.comment
    return {"data": msg}
