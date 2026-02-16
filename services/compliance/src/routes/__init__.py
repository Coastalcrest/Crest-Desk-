"""Compliance service API routes."""
from .check import router as check_router
from .rules import router as rules_router
from .validate import router as validate_router

__all__ = ["check_router", "rules_router", "validate_router"]
