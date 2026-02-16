"""AI Assist service API routes."""
from .chat import router as chat_router
from .articles import router as articles_router

__all__ = ["chat_router", "articles_router"]
