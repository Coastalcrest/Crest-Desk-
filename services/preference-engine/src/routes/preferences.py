"""Preference engine API routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

from ..behavior_tracker import tracker
from ..models import (
    BatchTrackRequest,
    BatchTrackResponse,
    BehaviorSummary,
    GetRecommendationsRequest,
    PreferenceCategory,
    PreferencesResponse,
    RecommendationsResponse,
    TrackEventRequest,
    TrackEventResponse,
    UpdatePreferencesRequest,
    UserPreference,
)

router = APIRouter(prefix="/api", tags=["preferences"])


def _extract_auth(
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> tuple[str, str]:
    """Extract user and tenant from service-to-service headers."""
    return x_user_id, x_tenant_id


# ---------- Event Tracking ---------- #

@router.post("/events/track", response_model=TrackEventResponse)
async def track_event(
    body: TrackEventRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> TrackEventResponse:
    """Track a single user behavior event."""
    event_id = tracker.track_event(x_user_id, x_tenant_id, body)
    return TrackEventResponse(event_id=event_id)


@router.post("/events/track/batch", response_model=BatchTrackResponse)
async def track_events_batch(
    body: BatchTrackRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> BatchTrackResponse:
    """Track multiple events at once."""
    tracked = 0
    failed = 0
    for event in body.events:
        try:
            tracker.track_event(x_user_id, x_tenant_id, event)
            tracked += 1
        except Exception:
            failed += 1
    return BatchTrackResponse(tracked=tracked, failed=failed)


# ---------- Preferences CRUD ---------- #

@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(
    category: PreferenceCategory | None = None,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> PreferencesResponse:
    """Get user preferences, optionally filtered by category."""
    prefs = tracker.get_preferences(
        x_user_id,
        x_tenant_id,
        category=category.value if category else None,
    )

    preference_list = [
        UserPreference(
            category=PreferenceCategory(cat),
            preferences=values,
            updated_at=datetime.now(timezone.utc),
        )
        for cat, values in prefs.items()
    ]

    return PreferencesResponse(
        user_id=x_user_id,
        tenant_id=x_tenant_id,
        preferences=preference_list,
    )


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    body: UpdatePreferencesRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> PreferencesResponse:
    """Update user preferences for a category."""
    updated = tracker.update_preferences(
        x_user_id,
        x_tenant_id,
        body.category.value,
        body.preferences,
        merge=body.merge,
    )

    return PreferencesResponse(
        user_id=x_user_id,
        tenant_id=x_tenant_id,
        preferences=[
            UserPreference(
                category=body.category,
                preferences=updated,
                updated_at=datetime.now(timezone.utc),
            )
        ],
    )


@router.delete("/preferences/{category}")
async def delete_preferences(
    category: PreferenceCategory,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> dict:
    """Delete preferences for a specific category."""
    prefs = tracker.get_preferences(x_user_id, x_tenant_id, category.value)
    if not prefs:
        raise HTTPException(status_code=404, detail="No preferences found for category")

    tracker.update_preferences(x_user_id, x_tenant_id, category.value, {}, merge=False)
    return {"deleted": True, "category": category.value}


# ---------- Recommendations ---------- #

@router.post("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    body: GetRecommendationsRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> RecommendationsResponse:
    """Get personalized recommendations based on behavior."""
    recommendations = tracker.get_recommendations(
        x_user_id,
        x_tenant_id,
        types=body.types,
        limit=body.limit,
        context=body.context,
    )

    return RecommendationsResponse(
        user_id=x_user_id,
        recommendations=recommendations,
        generated_at=datetime.now(timezone.utc),
    )


# ---------- Behavior Summary ---------- #

@router.get("/behavior/summary", response_model=BehaviorSummary)
async def get_behavior_summary(
    period_days: int = 30,
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> BehaviorSummary:
    """Get a summary of user behavior over a time period."""
    return tracker.get_behavior_summary(x_user_id, x_tenant_id, period_days)


# ---------- Data Management ---------- #

@router.delete("/user-data")
async def clear_user_data(
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_tenant_id: str = Header(..., alias="X-Tenant-Id"),
) -> dict:
    """Clear all tracked data for the current user (GDPR compliance)."""
    cleared = tracker.clear_user_data(x_user_id)
    return {"cleared": cleared, "user_id": x_user_id}
