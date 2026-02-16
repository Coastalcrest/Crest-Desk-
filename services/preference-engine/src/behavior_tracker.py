"""Behavior tracking and analysis engine."""
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from .models import (
    EventType,
    Priority,
    Recommendation,
    RecommendationType,
    TrackEventRequest,
    BehaviorSummary,
)


class BehaviorTracker:
    """Tracks user behavior events and generates insights."""

    def __init__(self) -> None:
        # user_id -> list of events
        self._events: dict[str, list[dict[str, Any]]] = defaultdict(list)
        # user_id -> category -> preferences
        self._preferences: dict[str, dict[str, dict[str, Any]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        # Max events per user to keep in memory
        self._max_events_per_user = 1000

    def track_event(
        self,
        user_id: str,
        tenant_id: str,
        event: TrackEventRequest,
    ) -> str:
        """Track a single behavioral event. Returns event_id."""
        event_id = str(uuid.uuid4())
        record = {
            "event_id": event_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "event_type": event.event_type.value,
            "resource_type": event.resource_type,
            "resource_id": event.resource_id,
            "metadata": event.metadata,
            "timestamp": (event.timestamp or datetime.now(timezone.utc)).isoformat(),
        }

        events = self._events[user_id]
        events.append(record)

        # Trim to max
        if len(events) > self._max_events_per_user:
            self._events[user_id] = events[-self._max_events_per_user:]

        return event_id

    def get_preferences(
        self,
        user_id: str,
        tenant_id: str,
        category: Optional[str] = None,
    ) -> dict[str, dict[str, Any]]:
        """Get user preferences, optionally filtered by category."""
        user_prefs = self._preferences.get(user_id, {})
        if category:
            cat_prefs = user_prefs.get(category, {})
            return {category: cat_prefs} if cat_prefs else {}
        return dict(user_prefs)

    def update_preferences(
        self,
        user_id: str,
        tenant_id: str,
        category: str,
        preferences: dict[str, Any],
        merge: bool = True,
    ) -> dict[str, Any]:
        """Update preferences for a category. Returns the updated preferences."""
        if merge:
            existing = self._preferences[user_id].get(category, {})
            existing.update(preferences)
            self._preferences[user_id][category] = existing
        else:
            self._preferences[user_id][category] = preferences

        return self._preferences[user_id][category]

    def get_recommendations(
        self,
        user_id: str,
        tenant_id: str,
        types: Optional[list[RecommendationType]] = None,
        limit: int = 10,
        context: Optional[dict[str, Any]] = None,
    ) -> list[Recommendation]:
        """Generate recommendations based on user behavior."""
        recommendations: list[Recommendation] = []
        events = self._events.get(user_id, [])

        # Analyze behavior patterns
        contact_interactions = [
            e for e in events if e["event_type"] == EventType.CONTACT_INTERACTION.value
        ]
        email_actions = [
            e for e in events if e["event_type"] == EventType.EMAIL_ACTION.value
        ]
        transaction_actions = [
            e for e in events if e["event_type"] == EventType.TRANSACTION_ACTION.value
        ]
        media_actions = [
            e for e in events if e["event_type"] == EventType.MEDIA_ACTION.value
        ]

        now = datetime.now(timezone.utc)
        requested_types = types or list(RecommendationType)

        # Contact follow-up recommendations
        if RecommendationType.CONTACT_FOLLOWUP in requested_types:
            if len(contact_interactions) > 0:
                # Recommend following up with recently interacted contacts
                recent_contacts = set()
                for e in reversed(contact_interactions[-10:]):
                    if e.get("resource_id"):
                        recent_contacts.add(e["resource_id"])

                for i, contact_id in enumerate(list(recent_contacts)[:3]):
                    recommendations.append(
                        Recommendation(
                            id=str(uuid.uuid4()),
                            type=RecommendationType.CONTACT_FOLLOWUP,
                            title="Follow up with recent contact",
                            description="You recently interacted with this contact. Consider sending a follow-up message.",
                            priority=Priority.MEDIUM if i == 0 else Priority.LOW,
                            score=0.8 - (i * 0.1),
                            resource_type="contact",
                            resource_id=contact_id,
                        )
                    )
            else:
                # No contact activity — suggest reaching out
                recommendations.append(
                    Recommendation(
                        id=str(uuid.uuid4()),
                        type=RecommendationType.CONTACT_FOLLOWUP,
                        title="Reconnect with your contacts",
                        description="You haven't interacted with contacts recently. Consider reaching out to maintain relationships.",
                        priority=Priority.MEDIUM,
                        score=0.6,
                    )
                )

        # Content creation recommendations
        if RecommendationType.CONTENT_CREATE in requested_types:
            if len(media_actions) < 3:
                recommendations.append(
                    Recommendation(
                        id=str(uuid.uuid4()),
                        type=RecommendationType.CONTENT_CREATE,
                        title="Create social media content",
                        description="Boost your online presence by creating a new social media post or property listing.",
                        priority=Priority.MEDIUM,
                        score=0.65,
                    )
                )
            if len(transaction_actions) > 5:
                recommendations.append(
                    Recommendation(
                        id=str(uuid.uuid4()),
                        type=RecommendationType.CONTENT_CREATE,
                        title="Create market update content",
                        description="With your active transaction pipeline, consider sharing a market update with your contacts.",
                        priority=Priority.LOW,
                        score=0.55,
                    )
                )

        # Workflow optimization recommendations
        if RecommendationType.WORKFLOW_OPTIMIZATION in requested_types:
            feature_counts: dict[str, int] = defaultdict(int)
            for e in events:
                if e["event_type"] == EventType.FEATURE_USE.value:
                    feature = e.get("metadata", {}).get("feature", "unknown")
                    feature_counts[feature] += 1

            if feature_counts:
                least_used = sorted(feature_counts.items(), key=lambda x: x[1])[:2]
                for feature, count in least_used:
                    recommendations.append(
                        Recommendation(
                            id=str(uuid.uuid4()),
                            type=RecommendationType.WORKFLOW_OPTIMIZATION,
                            title=f"Explore {feature.replace('_', ' ').title()}",
                            description=f"You've used this feature {count} time(s). It can help streamline your workflow.",
                            priority=Priority.LOW,
                            score=0.4,
                            metadata={"feature": feature, "usage_count": count},
                        )
                    )

        # Feature suggestion recommendations
        if RecommendationType.FEATURE_SUGGESTION in requested_types:
            used_features = set()
            for e in events:
                if e["event_type"] == EventType.FEATURE_USE.value:
                    used_features.add(e.get("metadata", {}).get("feature", ""))

            all_features = [
                "compliance_check", "document_templates", "ai_assist",
                "crm_pipeline", "social_media", "email_campaigns",
                "market_reports", "e_signatures", "task_automation",
            ]
            unused = [f for f in all_features if f not in used_features]
            for feature in unused[:2]:
                recommendations.append(
                    Recommendation(
                        id=str(uuid.uuid4()),
                        type=RecommendationType.FEATURE_SUGGESTION,
                        title=f"Try {feature.replace('_', ' ').title()}",
                        description=f"Discover how {feature.replace('_', ' ')} can improve your real estate business.",
                        priority=Priority.LOW,
                        score=0.35,
                        metadata={"feature": feature},
                    )
                )

        # Sort by score descending and limit
        recommendations.sort(key=lambda r: r.score, reverse=True)
        return recommendations[:limit]

    def get_behavior_summary(
        self,
        user_id: str,
        tenant_id: str,
        period_days: int = 30,
    ) -> BehaviorSummary:
        """Get a summary of user behavior over a period."""
        events = self._events.get(user_id, [])

        event_counts: dict[str, int] = defaultdict(int)
        hour_counts: dict[int, int] = defaultdict(int)
        feature_counts: dict[str, int] = defaultdict(int)
        last_active: Optional[datetime] = None

        for e in events:
            event_counts[e["event_type"]] += 1

            ts = e.get("timestamp", "")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts)
                    hour_counts[dt.hour] += 1
                    if last_active is None or dt > last_active:
                        last_active = dt
                except (ValueError, TypeError):
                    pass

            if e["event_type"] == EventType.FEATURE_USE.value:
                feature = e.get("metadata", {}).get("feature", "unknown")
                feature_counts[feature] += 1

        # Top 3 most active hours
        most_active_hours = sorted(hour_counts, key=hour_counts.get, reverse=True)[:3]  # type: ignore[arg-type]

        # Top 5 features
        top_features = sorted(feature_counts, key=feature_counts.get, reverse=True)[:5]  # type: ignore[arg-type]

        return BehaviorSummary(
            user_id=user_id,
            tenant_id=tenant_id,
            total_events=len(events),
            event_counts=dict(event_counts),
            most_active_hours=most_active_hours,
            top_features=top_features,
            last_active=last_active,
            period_days=period_days,
        )

    def clear_user_data(self, user_id: str) -> bool:
        """Clear all tracked data for a user (GDPR compliance)."""
        cleared = False
        if user_id in self._events:
            del self._events[user_id]
            cleared = True
        if user_id in self._preferences:
            del self._preferences[user_id]
            cleared = True
        return cleared


# Singleton instance
tracker = BehaviorTracker()
