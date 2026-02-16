"""Chat/conversation endpoints for AI Assist."""
import structlog
from fastapi import APIRouter, HTTPException

from ..conversation import (
    add_message,
    create_conversation,
    escalate_conversation,
    get_conversation,
    get_conversation_history,
    list_conversations,
)
from ..llm_client import generate_response
from ..models import (
    ConversationWithMessages,
    EscalateRequest,
    MessageRole,
    SendMessageRequest,
    StartConversationRequest,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["chat"])

# Placeholder user/tenant IDs (in production, extracted from auth token)
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


@router.get("/conversations")
async def list_user_conversations(page: int = 1, limit: int = 20):
    """List the current user's assist conversations."""
    conversations, total = list_conversations(
        user_id=DEFAULT_USER_ID,
        tenant_id=DEFAULT_TENANT_ID,
        page=page,
        limit=limit,
    )
    return {
        "data": [c.model_dump() for c in conversations],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max(1, (total + limit - 1) // limit),
        },
    }


@router.post("/conversations", status_code=201)
async def start_conversation(request: StartConversationRequest):
    """Start a new AI assist conversation."""
    # Create conversation
    title = request.message[:50] + ("..." if len(request.message) > 50 else "")
    conv = create_conversation(
        user_id=DEFAULT_USER_ID,
        tenant_id=DEFAULT_TENANT_ID,
        title=title,
        context_page=request.context_page,
        context_metadata=request.context_metadata,
    )

    # Add user message
    user_msg = add_message(conv.id, MessageRole.USER, request.message)

    # Generate AI response
    history = get_conversation_history(conv.id)
    response_text = await generate_response(
        message=request.message,
        conversation_history=history,
        context_page=request.context_page,
        metadata=request.context_metadata,
    )

    # Add assistant response
    assistant_msg = add_message(conv.id, MessageRole.ASSISTANT, response_text)

    full_conv = get_conversation(conv.id)
    return {"data": full_conv.model_dump() if full_conv else None}


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: str):
    """Get a conversation with all messages."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"data": conv.model_dump()}


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """Send a follow-up message in an existing conversation."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Add user message
    user_msg = add_message(conversation_id, MessageRole.USER, request.message)

    # Generate AI response with conversation history
    history = get_conversation_history(conversation_id)
    response_text = await generate_response(
        message=request.message,
        conversation_history=history,
        context_page=conv.context_page,
    )

    # Add assistant response
    assistant_msg = add_message(conversation_id, MessageRole.ASSISTANT, response_text)

    return {
        "data": {
            "user_message": user_msg.model_dump(),
            "assistant_message": assistant_msg.model_dump(),
        }
    }


@router.post("/conversations/{conversation_id}/escalate")
async def escalate_to_support(conversation_id: str, request: EscalateRequest):
    """Escalate a conversation to a support ticket."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    success = escalate_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to escalate conversation")

    logger.info(
        "conversation_escalated_to_support",
        conversation_id=conversation_id,
        subject=request.subject,
    )

    return {
        "data": {
            "conversation_id": conversation_id,
            "status": "escalated",
            "subject": request.subject,
            "description": request.description,
        }
    }
