"""Unit tests for the AI Copilot agent — tests mock deal data and alerts.

The agent module exposes helper functions that operate on in-memory mock
deal data.  These tests verify the shape and correctness of that data
without touching any external service.
"""
import pytest

from src.agent import get_deals_overview, get_deal_summary, get_upcoming_deadlines, get_alerts
from src.models import Alert, AlertSeverity, DealOverview, DealSummary, Deadline


# ------------------------------------------------------------------ #
#  get_deals_overview                                                #
# ------------------------------------------------------------------ #


class TestDealsOverview:
    """Tests for the deals overview function."""

    def test_returns_list(self):
        """get_deals_overview should return a list of DealOverview objects."""
        result = get_deals_overview()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_items_are_deal_overview_models(self):
        """Each item should be a DealOverview Pydantic model."""
        result = get_deals_overview()
        for deal in result:
            assert isinstance(deal, DealOverview)

    def test_deals_have_required_fields(self):
        """Every deal overview must have id, property_address, and status."""
        result = get_deals_overview()
        for deal in result:
            assert deal.id is not None and len(deal.id) > 0
            assert deal.property_address is not None and len(deal.property_address) > 0
            assert deal.status is not None and len(deal.status) > 0

    def test_deals_have_numeric_document_count(self):
        """document_count should be a non-negative integer."""
        result = get_deals_overview()
        for deal in result:
            assert isinstance(deal.document_count, int)
            assert deal.document_count >= 0


# ------------------------------------------------------------------ #
#  get_deal_summary                                                  #
# ------------------------------------------------------------------ #


class TestDealSummary:
    """Tests for the deal summary function."""

    def test_returns_summary_for_known_deal(self):
        """Known deal IDs should return a DealSummary."""
        result = get_deal_summary("deal-001")
        assert result is not None
        assert isinstance(result, DealSummary)

    def test_returns_none_for_unknown_deal(self):
        """Unknown deal IDs should return None."""
        result = get_deal_summary("nonexistent-deal-id")
        assert result is None

    def test_summary_contains_deal_data(self):
        """Returned summary should carry the deal dict and document_count."""
        result = get_deal_summary("deal-001")
        assert result is not None
        assert "id" in result.deal
        assert result.document_count >= 0

    def test_summary_compliance_status(self):
        """compliance_status should be a non-empty string."""
        result = get_deal_summary("deal-001")
        assert result is not None
        assert isinstance(result.compliance_status, str)
        assert len(result.compliance_status) > 0


# ------------------------------------------------------------------ #
#  get_upcoming_deadlines                                            #
# ------------------------------------------------------------------ #


class TestUpcomingDeadlines:
    """Tests for the upcoming deadlines function."""

    def test_returns_list(self):
        """get_upcoming_deadlines should return a list."""
        result = get_upcoming_deadlines(days=30)
        assert isinstance(result, list)

    def test_items_are_deadline_models(self):
        """Each item should be a Deadline Pydantic model."""
        result = get_upcoming_deadlines(days=90)
        for deadline in result:
            assert isinstance(deadline, Deadline)

    def test_deadlines_have_required_fields(self):
        """Each deadline must expose transaction_id, closing_date, and days_remaining."""
        result = get_upcoming_deadlines(days=90)
        for deadline in result:
            assert deadline.transaction_id is not None
            assert deadline.closing_date is not None
            assert isinstance(deadline.days_remaining, int)
            assert deadline.days_remaining >= 0

    def test_deadlines_sorted_by_days_remaining(self):
        """Deadlines should be sorted ascending by days_remaining."""
        result = get_upcoming_deadlines(days=90)
        if len(result) > 1:
            for i in range(len(result) - 1):
                assert result[i].days_remaining <= result[i + 1].days_remaining

    def test_narrow_window_returns_fewer_results(self):
        """A very short window should return fewer (or equal) results than a long one."""
        short = get_upcoming_deadlines(days=1)
        long = get_upcoming_deadlines(days=365)
        assert len(short) <= len(long)


# ------------------------------------------------------------------ #
#  get_alerts                                                        #
# ------------------------------------------------------------------ #


class TestAlerts:
    """Tests for the proactive alerts function."""

    def test_returns_list(self):
        """get_alerts should return a list."""
        result = get_alerts()
        assert isinstance(result, list)

    def test_items_are_alert_models(self):
        """Each item should be an Alert Pydantic model."""
        result = get_alerts()
        for alert in result:
            assert isinstance(alert, Alert)

    def test_alerts_have_required_fields(self):
        """Each alert should have severity, title, and description."""
        result = get_alerts()
        for alert in result:
            assert isinstance(alert.severity, AlertSeverity)
            assert alert.title is not None and len(alert.title) > 0
            assert alert.description is not None and len(alert.description) > 0

    def test_alerts_have_unique_ids(self):
        """Alert IDs should be unique."""
        result = get_alerts()
        ids = [a.id for a in result]
        assert len(ids) == len(set(ids))

    def test_alerts_reference_context(self):
        """Each alert should reference a context_type and optionally a context_id."""
        result = get_alerts()
        for alert in result:
            assert alert.context_type is not None
