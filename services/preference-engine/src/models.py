"""Pydantic models for the preference engine service."""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class PreferenceCategory(str, Enum):
    """Categories of user preferences."""
    GENERAL = "general"
    COMMUNICATION = "communication"
    MEDIA = "media"
    EMAIL = "email"
    WORKFLOW = "workflow"
    NOTIFICATIONS = "notifications"
    DASHBOARD = "dashboard"
    SCHEDULING = "scheduling"


class EventType(str, Enum):
    """Types of behavioral events to track."""
    PAGE_VIEW = "page_view"
    FEATURE_USE = "feature_use"
    SEARCH = "search"
    CONTACT_INTERACTION = "contact_interaction"
    DOCUMENT_ACTION = "document_action"
    EMAIL_ACTION = "email_action"
    MEDIA_ACTION = "media_action"
    TRANSACTION_ACTION = "transaction_action"
    SETTING_CHANGE = "setting_change"


class RecommendationType(str, Enum):
    """Types of recommendations the engine can produce."""
    CONTACT_FOLLOWUP = "contact_followup"
    CONTENT_CREATE = "content_create"
    PROPERTY_MATCH = "property_match"
    WORKFLOW_OPTIMIZATION = "workflow_optimization"
    FEATURE_SUGGESTION = "feature_suggestion"
    SCHEDULING_SUGGESTION = "scheduling_suggestion"


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ---- Request Models ---- #

class TrackEventRequest(BaseModel):
    """Track a user behavior event."""
    event_type: EventType
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None


class BatchTrackRequest(BaseModel):
    """Track multiple events at once."""
    events: list[TrackEventRequest] = Field(..., min_length=1, max_length=100)


class GetPreferencesRequest(BaseModel):
    """Request preferences for a specific category."""
    category: Optional[PreferenceCategory] = None


class UpdatePreferencesRequest(BaseModel):
    """Update user preferences."""
    category: PreferenceCategory
    preferences: dict[str, Any]
    merge: bool = True  # True = merge with existing, False = replace


class GetRecommendationsRequest(BaseModel):
    """Request recommendations."""
    types: Optional[list[RecommendationType]] = None
    limit: int = Field(default=10, ge=1, le=50)
    context: dict[str, Any] = Field(default_factory=dict)


# ---- Response Models ---- #

class TrackEventResponse(BaseModel):
    event_id: str
    tracked: bool = True


class BatchTrackResponse(BaseModel):
    tracked: int
    failed: int = 0


class UserPreference(BaseModel):
    category: PreferenceCategory
    preferences: dict[str, Any]
    updated_at: datetime


class PreferencesResponse(BaseModel):
    user_id: str
    tenant_id: str
    preferences: list[UserPreference]


class Recommendation(BaseModel):
    id: str
    type: RecommendationType
    title: str
    description: str
    priority: Priority
    score: float = Field(ge=0.0, le=1.0)
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    expires_at: Optional[datetime] = None


class RecommendationsResponse(BaseModel):
    user_id: str
    recommendations: list[Recommendation]
    generated_at: datetime


class BehaviorSummary(BaseModel):
    user_id: str
    tenant_id: str
    total_events: int
    event_counts: dict[str, int]
    most_active_hours: list[int]
    top_features: list[str]
    last_active: Optional[datetime] = None
    period_days: int = 30


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str = "1.0.0"
