"""Tests for the compliance rules engine."""
import pytest

from src.models import ContentType, EnforcementLevel, Severity
from src.rules_engine import ComplianceRulesEngine


@pytest.fixture
def engine():
    """Create a rules engine instance."""
    return ComplianceRulesEngine()


class TestFairHousing:
    """Tests for Fair Housing Act compliance checking."""

    @pytest.mark.asyncio
    async def test_clean_content_passes(self, engine):
        """Content without protected-class terms should pass."""
        result = await engine.check_content(
            content="Beautiful 3-bedroom home with hardwood floors and a large backyard.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        # May have required insertions (EHO) but no Fair Housing violations
        fair_housing_violations = [
            v for v in result.violations if "fair_housing" in v.rule_key
        ]
        assert len(fair_housing_violations) == 0

    @pytest.mark.asyncio
    async def test_critical_familial_status_term(self, engine):
        """'adults only' should trigger a critical violation."""
        result = await engine.check_content(
            content="Quiet adults only community near downtown.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        assert not result.compliant
        violations = [v for v in result.violations if "familial_status" in v.rule_key]
        assert len(violations) >= 1
        assert any(v.severity == Severity.CRITICAL for v in violations)

    @pytest.mark.asyncio
    async def test_ambiguous_term_is_warning(self, engine):
        """'master bedroom' should be a warning, not critical."""
        result = await engine.check_content(
            content="Spacious master bedroom with ensuite bath.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        violations = [v for v in result.violations if "fair_housing" in v.rule_key]
        assert len(violations) >= 1
        assert all(v.severity == Severity.WARNING for v in violations)
        assert all(v.enforcement == EnforcementLevel.WARN for v in violations)

    @pytest.mark.asyncio
    async def test_race_terms_detected(self, engine):
        """Racial terms should trigger critical violations."""
        result = await engine.check_content(
            content="Located in a white neighborhood.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        assert not result.compliant
        violations = [v for v in result.violations if "race" in v.rule_key]
        assert len(violations) >= 1

    @pytest.mark.asyncio
    async def test_religion_terms_detected(self, engine):
        """Religious terms should trigger violations."""
        result = await engine.check_content(
            content="Walking distance to the church and synagogue.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        violations = [v for v in result.violations if "religion" in v.rule_key]
        assert len(violations) >= 2  # church + synagogue

    @pytest.mark.asyncio
    async def test_disability_terms_detected(self, engine):
        """Disability-related terms should trigger violations."""
        result = await engine.check_content(
            content="No wheelchair access needed for this property.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        violations = [v for v in result.violations if "disability" in v.rule_key]
        assert len(violations) >= 1

    @pytest.mark.asyncio
    async def test_multiple_categories_detected(self, engine):
        """Multiple protected classes in one piece of content."""
        result = await engine.check_content(
            content="Adults only community near the church, no wheelchair access.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        assert not result.compliant
        categories = {v.rule_key.split(".")[-1] for v in result.violations if "fair_housing" in v.rule_key}
        assert "familial_status" in categories
        assert "religion" in categories
        assert "disability" in categories


class TestCanSpam:
    """Tests for CAN-SPAM Act compliance checking."""

    @pytest.mark.asyncio
    async def test_email_without_unsubscribe_fails(self, engine):
        """Email without unsubscribe mechanism should fail."""
        result = await engine.check_content(
            content="Check out our new listings! Great deals this month.",
            content_type=ContentType.EMAIL,
            state="OR",
        )
        canspam_violations = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam_violations) == 1
        assert canspam_violations[0].severity == Severity.CRITICAL

    @pytest.mark.asyncio
    async def test_email_with_unsubscribe_passes(self, engine):
        """Email with unsubscribe link should pass CAN-SPAM."""
        result = await engine.check_content(
            content="Check out our new listings! To unsubscribe, click here.",
            content_type=ContentType.EMAIL,
            state="OR",
        )
        canspam_violations = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam_violations) == 0

    @pytest.mark.asyncio
    async def test_email_with_opt_out_passes(self, engine):
        """Email with opt-out link should pass CAN-SPAM."""
        result = await engine.check_content(
            content="New properties available! Opt out of these emails.",
            content_type=ContentType.EMAIL,
            state="OR",
        )
        canspam_violations = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam_violations) == 0

    @pytest.mark.asyncio
    async def test_non_email_skips_canspam(self, engine):
        """Non-email content should not trigger CAN-SPAM checks."""
        result = await engine.check_content(
            content="Check out our new listings! Great deals.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        canspam_violations = [v for v in result.violations if "can_spam" in v.rule_key]
        assert len(canspam_violations) == 0


class TestEqualHousingOpportunity:
    """Tests for Equal Housing Opportunity requirement."""

    @pytest.mark.asyncio
    async def test_missing_eho_triggers_insertion(self, engine):
        """Content without EHO statement should require insertion."""
        result = await engine.check_content(
            content="Beautiful home for sale in Portland.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        eho_insertions = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho_insertions) == 1
        assert eho_insertions[0].content == "Equal Housing Opportunity"

    @pytest.mark.asyncio
    async def test_present_eho_no_insertion(self, engine):
        """Content with EHO statement should not trigger insertion."""
        result = await engine.check_content(
            content="Beautiful home for sale. Equal Housing Opportunity.",
            content_type=ContentType.SOCIAL_POST,
            state="OR",
        )
        eho_insertions = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho_insertions) == 0

    @pytest.mark.asyncio
    async def test_video_skips_eho(self, engine):
        """Video content should not require EHO insertion."""
        result = await engine.check_content(
            content="Property tour video description.",
            content_type=ContentType.VIDEO,
            state="OR",
        )
        eho_insertions = [
            i for i in result.required_insertions
            if i.element == "equal_housing_opportunity"
        ]
        assert len(eho_insertions) == 0


class TestQuickValidation:
    """Tests for the quick validation endpoint logic."""

    @pytest.mark.asyncio
    async def test_fully_compliant_content(self, engine):
        """Clean content should pass all checks."""
        result = await engine.check_content(
            content="3-bed, 2-bath home with great views. Equal Housing Opportunity.",
            content_type=ContentType.DOCUMENT,
            state="OR",
        )
        assert result.compliant
        assert len(result.violations) == 0
