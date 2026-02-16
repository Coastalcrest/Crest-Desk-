"""Unit tests for the compliance rules engine — pure logic tests.

These tests exercise the hardcoded federal rule checks (Fair Housing,
CAN-SPAM, Equal Housing Opportunity) without hitting the database.
The async ``check_content`` method is tested with its database call
mocked to return an empty rule set so that only the in-process logic
is evaluated.
"""
import pytest
from unittest.mock import AsyncMock, patch

from src.models import ContentType, EnforcementLevel, Severity
from src.rules_engine import ComplianceRulesEngine


@pytest.fixture
def engine():
    """Create a fresh rules engine instance."""
    return ComplianceRulesEngine()


# Helper — patches the DB loader so check_content never touches the network.
_MOCK_DB = patch(
    "src.rules_engine.load_rules_for_jurisdictions",
    new_callable=AsyncMock,
    return_value=[],
)


# ------------------------------------------------------------------ #
#  Fair Housing Act violation detection                               #
# ------------------------------------------------------------------ #


class TestFairHousingCheck:
    """Test Fair Housing Act violation detection."""

    @pytest.mark.asyncio
    async def test_blocks_familial_status_discrimination(self, engine):
        """Explicit 'no children' language must trigger a critical violation."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Beautiful home in adults-only community. No children allowed.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        violations = [v for v in result.violations if "fair_housing" in v.rule_key]
        assert len(violations) > 0
        assert any(v.severity == Severity.CRITICAL for v in violations)

    @pytest.mark.asyncio
    async def test_blocks_racial_discrimination(self, engine):
        """Content with racial terms must produce violations."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Perfect neighborhood for white families only.",
                ContentType.LISTING_IMAGE,
                "WA",
            )
        violations = [v for v in result.violations if "fair_housing" in v.rule_key]
        assert len(violations) > 0

    @pytest.mark.asyncio
    async def test_warns_on_ambiguous_language(self, engine):
        """'master bedroom' is ambiguous — should be WARNING, not CRITICAL."""
        with _MOCK_DB:
            result = await engine.check_content(
                "This property features a spacious master bedroom.",
                ContentType.EMAIL,
                "OR",
            )
        warnings = [
            v
            for v in result.violations
            if "fair_housing" in v.rule_key and v.severity == Severity.WARNING
        ]
        assert len(warnings) >= 1
        assert all(v.enforcement == EnforcementLevel.WARN for v in warnings)

    @pytest.mark.asyncio
    async def test_clean_content_passes(self, engine):
        """Neutral listing copy must not trigger fair-housing violations."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Beautiful 3-bedroom home with updated kitchen and spacious backyard.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        fair_housing_errors = [
            v
            for v in result.violations
            if "fair_housing" in v.rule_key and v.severity == Severity.CRITICAL
        ]
        assert len(fair_housing_errors) == 0

    @pytest.mark.asyncio
    async def test_disability_discrimination(self, engine):
        """Disability-related language must trigger violations."""
        with _MOCK_DB:
            result = await engine.check_content(
                "No wheelchair ramps. Not suitable for handicapped persons.",
                ContentType.LISTING_IMAGE,
                "CA",
            )
        violations = [v for v in result.violations if "disability" in v.rule_key]
        assert len(violations) > 0

    @pytest.mark.asyncio
    async def test_national_origin_discrimination(self, engine):
        """National-origin exclusionary language must be caught."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Citizen only applicants please. English only spoken here.",
                ContentType.SOCIAL_POST,
                "TX",
            )
        violations = [v for v in result.violations if "national_origin" in v.rule_key]
        assert len(violations) > 0

    @pytest.mark.asyncio
    async def test_religion_terms_detected(self, engine):
        """Religious landmark references should trigger violations."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Great location near the church and mosque.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        violations = [v for v in result.violations if "religion" in v.rule_key]
        assert len(violations) >= 2  # church + mosque

    @pytest.mark.asyncio
    async def test_multiple_categories_in_one_text(self, engine):
        """Content violating several protected classes at once."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Adults only community near the church, no wheelchair access.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        assert not result.compliant
        categories = {
            v.rule_key.split(".")[-1]
            for v in result.violations
            if "fair_housing" in v.rule_key
        }
        assert "familial_status" in categories
        assert "religion" in categories
        assert "disability" in categories


# ------------------------------------------------------------------ #
#  CAN-SPAM Act compliance                                           #
# ------------------------------------------------------------------ #


class TestCanSpamCheck:
    """Test CAN-SPAM compliance checking."""

    @pytest.mark.asyncio
    async def test_email_without_unsubscribe_fails(self, engine):
        """Marketing email lacking an opt-out mechanism must fail."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Check out our latest listings! Great deals this week!",
                ContentType.EMAIL,
                "US",
            )
        canspam = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam) == 1
        assert canspam[0].severity == Severity.CRITICAL

    @pytest.mark.asyncio
    async def test_email_with_unsubscribe_passes(self, engine):
        """Email containing 'unsubscribe' should satisfy CAN-SPAM."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Check out our latest listings! Click here to unsubscribe from this mailing list.",
                ContentType.EMAIL,
                "US",
            )
        canspam = [
            v
            for v in result.violations
            if "can_spam" in v.rule_key and v.severity == Severity.CRITICAL
        ]
        assert len(canspam) == 0

    @pytest.mark.asyncio
    async def test_email_with_opt_out_passes(self, engine):
        """'opt out' phrasing should also satisfy CAN-SPAM."""
        with _MOCK_DB:
            result = await engine.check_content(
                "New properties available! Opt out of these emails.",
                ContentType.EMAIL,
                "OR",
            )
        canspam = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam) == 0

    @pytest.mark.asyncio
    async def test_email_with_manage_preferences_passes(self, engine):
        """'manage preferences' should also count as an opt-out mechanism."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Weekly digest from CrestDesk. Manage your preferences.",
                ContentType.EMAIL,
                "OR",
            )
        canspam = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam) == 0

    @pytest.mark.asyncio
    async def test_non_email_skips_canspam(self, engine):
        """Social posts should not be evaluated for CAN-SPAM."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Check out our new listings! Great deals.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        canspam = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam) == 0


# ------------------------------------------------------------------ #
#  Equal Housing Opportunity statement                               #
# ------------------------------------------------------------------ #


class TestEqualHousingOpportunity:
    """Test Equal Housing Opportunity statement requirements."""

    @pytest.mark.asyncio
    async def test_social_post_needs_eho(self, engine):
        """A social post without the EHO statement needs an insertion."""
        with _MOCK_DB:
            result = await engine.check_content(
                "New listing! 3BR/2BA in Portland.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        eho = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho) == 1
        assert eho[0].content == "Equal Housing Opportunity"

    @pytest.mark.asyncio
    async def test_eho_present_skips_insertion(self, engine):
        """Content already containing the EHO statement needs no insertion."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Beautiful home for sale. Equal Housing Opportunity.",
                ContentType.SOCIAL_POST,
                "OR",
            )
        eho = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho) == 0

    @pytest.mark.asyncio
    async def test_video_skips_eho(self, engine):
        """Video content type is not in EHO_CONTENT_TYPES — no insertion."""
        with _MOCK_DB:
            result = await engine.check_content(
                "Property tour video description.",
                ContentType.VIDEO,
                "OR",
            )
        eho = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho) == 0

    @pytest.mark.asyncio
    async def test_email_needs_eho(self, engine):
        """Emails are in EHO_CONTENT_TYPES — should require insertion if missing."""
        with _MOCK_DB:
            result = await engine.check_content(
                "New listing alert! Don't miss this one. Unsubscribe here.",
                ContentType.EMAIL,
                "OR",
            )
        eho = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho) == 1


# ------------------------------------------------------------------ #
#  Internal helper: _check_fair_housing (synchronous, no DB)         #
# ------------------------------------------------------------------ #


class TestFairHousingHelper:
    """Directly test the synchronous _check_fair_housing helper for speed."""

    def test_returns_empty_for_safe_text(self, engine):
        violations = engine._check_fair_housing(
            "Beautiful 3-bedroom home with mountain views and modern updates."
        )
        critical = [v for v in violations if v.severity == Severity.CRITICAL]
        assert len(critical) == 0

    def test_detects_adults_only(self, engine):
        violations = engine._check_fair_housing("Adults only community.")
        assert any("familial_status" in v.rule_key for v in violations)

    def test_detects_wheelchair(self, engine):
        violations = engine._check_fair_housing("No wheelchair access.")
        assert any("disability" in v.rule_key for v in violations)

    def test_ambiguous_family_room_is_warning(self, engine):
        violations = engine._check_fair_housing(
            "Large family room with fireplace."
        )
        matching = [v for v in violations if "family" in v.message.lower()]
        for v in matching:
            if "family room" in v.message:
                assert v.severity == Severity.WARNING


# ------------------------------------------------------------------ #
#  Internal helper: _check_can_spam (synchronous, no DB)             #
# ------------------------------------------------------------------ #


class TestCanSpamHelper:
    """Directly test the synchronous _check_can_spam helper."""

    def test_missing_unsubscribe_returns_violation(self, engine):
        violations = engine._check_can_spam("Buy now! Best deals ever!")
        assert len(violations) == 1
        assert violations[0].severity == Severity.CRITICAL

    def test_has_unsubscribe_returns_empty(self, engine):
        violations = engine._check_can_spam(
            "Weekly newsletter. Click to unsubscribe."
        )
        assert len(violations) == 0
