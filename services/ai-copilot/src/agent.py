"""Agent loop — intent classification, tool selection, execution, and response."""
from datetime import datetime, timezone, timedelta
from typing import Any
from uuid import uuid4

import structlog

from .models import (
    Alert,
    AlertSeverity,
    ContextType,
    Deadline,
    DealOverview,
    DealSummary,
)

logger = structlog.get_logger()

# In-memory mock data for demonstration (replace with real DB queries)
MOCK_DEALS: list[dict[str, Any]] = [
    {
        "id": "deal-001",
        "property_address": "123 Main St, Portland, OR 97201",
        "status": "under_contract",
        "purchase_price": "425000.00",
        "closing_date": (datetime.now(timezone.utc) + timedelta(days=12)).strftime("%Y-%m-%d"),
        "document_count": 8,
    },
    {
        "id": "deal-002",
        "property_address": "456 Oak Ave, Salem, OR 97301",
        "status": "active",
        "purchase_price": "350000.00",
        "closing_date": (datetime.now(timezone.utc) + timedelta(days=45)).strftime("%Y-%m-%d"),
        "document_count": 3,
    },
    {
        "id": "deal-003",
        "property_address": "789 Pine Rd, Eugene, OR 97401",
        "status": "under_contract",
        "purchase_price": "275000.00",
        "closing_date": (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d"),
        "document_count": 12,
    },
]


def get_deals_overview() -> list[DealOverview]:
    """Get overview of all active deals."""
    return [
        DealOverview(
            id=d["id"],
            property_address=d["property_address"],
            status=d["status"],
            purchase_price=d["purchase_price"],
            closing_date=d["closing_date"],
            document_count=d["document_count"],
        )
        for d in MOCK_DEALS
    ]


def get_deal_summary(deal_id: str) -> DealSummary | None:
    """Get detailed summary of a specific deal."""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        return None

    return DealSummary(
        deal=deal,
        transaction={"type": "purchase", "agent_role": "listing_agent"},
        compliance_status="in_progress",
        document_count=deal["document_count"],
    )


def get_upcoming_deadlines(days: int = 30) -> list[Deadline]:
    """Get transactions with closing dates within the specified number of days."""
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    deadlines: list[Deadline] = []

    for deal in MOCK_DEALS:
        closing = datetime.strptime(deal["closing_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if closing <= cutoff:
            days_remaining = (closing - now).days
            deadlines.append(
                Deadline(
                    transaction_id=deal["id"],
                    property_address=deal["property_address"],
                    closing_date=deal["closing_date"],
                    days_remaining=max(0, days_remaining),
                    status=deal["status"],
                )
            )

    deadlines.sort(key=lambda d: d.days_remaining)
    return deadlines


def get_alerts() -> list[Alert]:
    """Generate proactive alerts based on deal data."""
    alerts: list[Alert] = []
    now = datetime.now(timezone.utc)

    for deal in MOCK_DEALS:
        closing = datetime.strptime(deal["closing_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        days_remaining = (closing - now).days

        # Deadline alert
        if 0 <= days_remaining <= 7:
            alerts.append(
                Alert(
                    id=str(uuid4()),
                    severity=AlertSeverity.WARNING,
                    title=f"Closing in {days_remaining} days",
                    description=f"{deal['property_address']} closes on {deal['closing_date']}. Ensure all documents are finalized.",
                    context_type=ContextType.TRANSACTION,
                    context_id=deal["id"],
                )
            )

        # Low document count alert
        if deal["document_count"] < 5:
            alerts.append(
                Alert(
                    id=str(uuid4()),
                    severity=AlertSeverity.INFO,
                    title="Low document count",
                    description=f"{deal['property_address']} has only {deal['document_count']} documents. Consider uploading required disclosures.",
                    context_type=ContextType.DOCUMENT,
                    context_id=deal["id"],
                )
            )

    return alerts
