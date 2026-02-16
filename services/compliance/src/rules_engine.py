"""Compliance rules engine — loads and evaluates federal and state rules."""
import re
from typing import Any

import structlog

from .database import load_rules_for_jurisdictions
from .models import (
    ContentCheckResponse,
    ContentType,
    EnforcementLevel,
    InsertionPosition,
    RequiredInsertion,
    Severity,
    Violation,
)

logger = structlog.get_logger()

# ------------------------------------------------------------------ #
#  Fair Housing Act protected-class terms (42 U.S.C. § 3604)         #
# ------------------------------------------------------------------ #

FAIR_HOUSING_TERMS: dict[str, list[str]] = {
    "familial_status": [
        "family", "families", "children", "kids", "no children",
        "adults only", "single", "married", "couple",
    ],
    "race": [
        "race", "racial", "white", "black", "asian",
        "hispanic", "latino", "african american",
    ],
    "religion": [
        "church", "synagogue", "mosque", "temple",
        "christian", "muslim", "jewish", "catholic",
    ],
    "national_origin": [
        "immigrant", "foreigner", "citizen only",
        "english only", "american born",
    ],
    "disability": [
        "handicap", "wheelchair", "disabled", "crippled",
        "deaf", "blind", "mentally ill",
    ],
    "sex": [
        "bachelor", "bachelor pad", "man cave",
        "master bedroom", "his and hers",
    ],
}

AMBIGUOUS_TERMS: set[str] = {
    "master bedroom",
    "walking distance",
    "family room",
    "single family",
    "family friendly",
}

# ------------------------------------------------------------------ #
#  CAN-SPAM Act unsubscribe patterns (15 U.S.C. § 7704)             #
# ------------------------------------------------------------------ #

CAN_SPAM_PATTERNS: list[re.Pattern] = [
    re.compile(r"unsubscribe", re.IGNORECASE),
    re.compile(r"opt[\s\-]?out", re.IGNORECASE),
    re.compile(r"remove\s+from\s+(this\s+)?list", re.IGNORECASE),
    re.compile(r"manage\s+(your\s+)?preferences", re.IGNORECASE),
    re.compile(r"email\s+preferences", re.IGNORECASE),
]

# ------------------------------------------------------------------ #
#  Equal Housing Opportunity pattern                                  #
# ------------------------------------------------------------------ #

EQUAL_HOUSING_PATTERN = re.compile(r"equal\s+housing\s+opportunity", re.IGNORECASE)

# Content types that require Equal Housing Opportunity statement
EHO_CONTENT_TYPES = {
    ContentType.SOCIAL_POST,
    ContentType.LISTING_IMAGE,
    ContentType.EMAIL,
    ContentType.DOCUMENT,
}


def _term_regex(term: str) -> re.Pattern:
    """Build a word-boundary regex for a term.

    Multi-word terms are matched as a phrase; single-word terms use \\b anchors.
    """
    escaped = re.escape(term)
    return re.compile(rf"\b{escaped}\b", re.IGNORECASE)


class ComplianceRulesEngine:
    """Evaluates content against federal and state compliance rules.

    The engine combines hardcoded federal checks (Fair Housing, CAN-SPAM) with
    database-backed state-specific rules for comprehensive compliance coverage.
    """

    # Cache compiled term regexes to avoid recompiling on every check
    _term_cache: dict[str, re.Pattern] = {}

    def __init__(self) -> None:
        """Initialize the rules engine."""
        # Pre-compile Fair Housing term regexes
        for terms in FAIR_HOUSING_TERMS.values():
            for term in terms:
                if term not in self._term_cache:
                    self._term_cache[term] = _term_regex(term)

    async def check_content(
        self,
        content: str,
        content_type: ContentType,
        state: str,
        metadata: dict[str, Any] | None = None,
    ) -> ContentCheckResponse:
        """Check content against all applicable compliance rules.

        Args:
            content: The text content to check.
            content_type: Type of content (social_post, email, etc.).
            state: Two-letter US state code.
            metadata: Additional context for rule evaluation.

        Returns:
            ContentCheckResponse with violations and required insertions.
        """
        logger.info(
            "compliance_check_start",
            content_type=content_type.value,
            state=state,
            content_length=len(content),
        )

        violations: list[Violation] = []
        required_insertions: list[RequiredInsertion] = []

        # Load applicable rules from database
        db_rules = await load_rules_for_jurisdictions(
            jurisdictions=["US", state.upper()],
            content_type=content_type.value,
        )

        # 1. Fair Housing Act check (all content types)
        violations.extend(self._check_fair_housing(content))

        # 2. Advertising license check (state-specific)
        license_violations, license_insertions = self._check_advertising_license(
            content, state, db_rules
        )
        violations.extend(license_violations)
        required_insertions.extend(license_insertions)

        # 3. CAN-SPAM Act check (email only)
        if content_type == ContentType.EMAIL:
            violations.extend(self._check_can_spam(content))

        # 4. Equal Housing Opportunity check
        if content_type in EHO_CONTENT_TYPES:
            eho_insertions = self._check_equal_housing(content)
            required_insertions.extend(eho_insertions)

        # 5. Database-backed rule checks (state-specific custom rules)
        db_violations, db_insertions = self._check_database_rules(
            content, content_type, state, db_rules, metadata
        )
        violations.extend(db_violations)
        required_insertions.extend(db_insertions)

        compliant = len(violations) == 0

        logger.info(
            "compliance_check_complete",
            content_type=content_type.value,
            state=state,
            compliant=compliant,
            violation_count=len(violations),
            insertion_count=len(required_insertions),
        )

        return ContentCheckResponse(
            compliant=compliant,
            violations=violations,
            required_insertions=required_insertions,
        )

    def _check_fair_housing(self, content: str) -> list[Violation]:
        """Check content for Fair Housing Act violations.

        Scans for protected-class terms across 6 categories:
        - Familial status
        - Race
        - Religion
        - National origin
        - Disability
        - Sex

        Returns:
            List of Fair Housing violations.
        """
        violations: list[Violation] = []
        lower_content = content.lower()

        for protected_class, terms in FAIR_HOUSING_TERMS.items():
            for term in terms:
                regex = self._term_cache.get(term) or _term_regex(term)
                if not regex.search(lower_content):
                    continue

                is_ambiguous = term in AMBIGUOUS_TERMS

                violations.append(
                    Violation(
                        rule_key=f"US.advertising.fair_housing.{protected_class}",
                        severity=Severity.WARNING if is_ambiguous else Severity.CRITICAL,
                        message=(
                            f'Potentially problematic term "{term}" detected. '
                            "Review in context to ensure Fair Housing compliance."
                            if is_ambiguous
                            else f'Content contains protected-class term "{term}" '
                            "which may violate Fair Housing Act guidelines."
                        ),
                        jurisdiction="US",
                        enforcement=EnforcementLevel.WARN if is_ambiguous else EnforcementLevel.BLOCK,
                    )
                )

        return violations

    def _check_advertising_license(
        self,
        content: str,
        state: str,
        rules: list[dict],
    ) -> tuple[list[Violation], list[RequiredInsertion]]:
        """Check for state-specific advertising license requirements.

        Args:
            content: Text content to check.
            state: Two-letter state code.
            rules: Database rules for applicable jurisdictions.

        Returns:
            Tuple of (violations, required_insertions).
        """
        violations: list[Violation] = []
        insertions: list[RequiredInsertion] = []

        # Find license-related rule for this state or federal
        license_rule = next(
            (
                r
                for r in rules
                if "license" in r.get("rule_key", "")
                and (
                    r.get("rule_key", "").startswith(f"{state}.")
                    or r.get("rule_key", "").startswith("US.")
                )
            ),
            None,
        )

        if license_rule:
            params = license_rule.get("parameters") or {}
            requires_license = params.get("requireLicenseNumber", False)

            if requires_license:
                # Check if content already contains a license number pattern
                license_pattern = re.compile(r"license\s*#?\s*\d+", re.IGNORECASE)
                if not license_pattern.search(content):
                    violations.append(
                        Violation(
                            rule_key=license_rule["rule_key"],
                            severity=Severity.WARNING,
                            message=f"{state} requires real estate license number "
                            "to be displayed in advertising.",
                            jurisdiction=state,
                            enforcement=EnforcementLevel.REQUIRE,
                        )
                    )
                    insertions.append(
                        RequiredInsertion(
                            element="license_disclaimer",
                            content="License #[YOUR_LICENSE_NUMBER]",
                            position=InsertionPosition.FOOTER,
                            jurisdiction=state,
                        )
                    )

        return violations, insertions

    def _check_can_spam(self, content: str) -> list[Violation]:
        """Check email content for CAN-SPAM Act compliance.

        Verifies the presence of an unsubscribe mechanism.

        Args:
            content: Email text content.

        Returns:
            List of CAN-SPAM violations.
        """
        has_unsubscribe = any(p.search(content) for p in CAN_SPAM_PATTERNS)

        if not has_unsubscribe:
            return [
                Violation(
                    rule_key="US.advertising.can_spam.unsubscribe",
                    severity=Severity.CRITICAL,
                    message="Email content must include an unsubscribe mechanism "
                    "per CAN-SPAM Act.",
                    jurisdiction="US",
                    enforcement=EnforcementLevel.REQUIRE,
                )
            ]

        return []

    def _check_equal_housing(self, content: str) -> list[RequiredInsertion]:
        """Check for Equal Housing Opportunity statement.

        Required for social posts, listing images, emails, and documents.

        Args:
            content: Text content to check.

        Returns:
            Required insertions if EHO statement is missing.
        """
        if not EQUAL_HOUSING_PATTERN.search(content):
            return [
                RequiredInsertion(
                    element="equal_housing_opportunity",
                    content="Equal Housing Opportunity",
                    position=InsertionPosition.FOOTER,
                    jurisdiction="US",
                )
            ]
        return []

    def _check_database_rules(
        self,
        content: str,
        content_type: ContentType,
        state: str,
        rules: list[dict],
        metadata: dict[str, Any] | None = None,
    ) -> tuple[list[Violation], list[RequiredInsertion]]:
        """Evaluate database-backed compliance rules.

        Processes rules loaded from the compliance_rules table, checking
        for blocked terms, required disclosures, and auto-insertions.

        Args:
            content: Text content to check.
            content_type: Type of content.
            state: State jurisdiction.
            rules: Rules loaded from database.
            metadata: Additional context.

        Returns:
            Tuple of (violations, required_insertions).
        """
        violations: list[Violation] = []
        insertions: list[RequiredInsertion] = []
        lower_content = content.lower()

        for rule in rules:
            rule_key = rule.get("rule_key", "")
            enforcement = rule.get("enforcement", "warn")
            params = rule.get("parameters") or {}

            # Skip Fair Housing rules (already handled above with hardcoded logic)
            if "fair_housing" in rule_key:
                continue

            # Skip CAN-SPAM (already handled above)
            if "can_spam" in rule_key:
                continue

            # Process blocked terms
            blocked_terms = params.get("blocked_terms", [])
            if isinstance(blocked_terms, list):
                for term in blocked_terms:
                    if not isinstance(term, str):
                        continue
                    regex = _term_regex(term)
                    if regex.search(lower_content):
                        violations.append(
                            Violation(
                                rule_key=rule_key,
                                severity=Severity.CRITICAL if enforcement == "block" else Severity.WARNING,
                                message=f'Content contains prohibited term "{term}" '
                                f'per rule: {rule.get("title", rule_key)}.',
                                jurisdiction=rule.get("jurisdiction", state),
                                enforcement=EnforcementLevel(enforcement),
                            )
                        )

            # Process warned terms
            warned_terms = params.get("warned_terms", [])
            if isinstance(warned_terms, list):
                for term in warned_terms:
                    if not isinstance(term, str):
                        continue
                    regex = _term_regex(term)
                    if regex.search(lower_content):
                        violations.append(
                            Violation(
                                rule_key=rule_key,
                                severity=Severity.WARNING,
                                message=f'Term "{term}" may need review '
                                f'per rule: {rule.get("title", rule_key)}.',
                                jurisdiction=rule.get("jurisdiction", state),
                                enforcement=EnforcementLevel.WARN,
                            )
                        )

            # Process required disclosures (enforcement=require)
            if enforcement == "require":
                required_text = params.get("required_text", "")
                if required_text and isinstance(required_text, str):
                    if required_text.lower() not in lower_content:
                        violations.append(
                            Violation(
                                rule_key=rule_key,
                                severity=Severity.WARNING,
                                message=f'Required disclosure missing: {rule.get("title", rule_key)}.',
                                jurisdiction=rule.get("jurisdiction", state),
                                enforcement=EnforcementLevel.REQUIRE,
                            )
                        )

            # Process auto-insertions (enforcement=insert)
            if enforcement == "insert":
                insert_text = params.get("insert_text", "")
                insert_position = params.get("insert_position", "footer")
                if insert_text and isinstance(insert_text, str):
                    if insert_text.lower() not in lower_content:
                        insertions.append(
                            RequiredInsertion(
                                element=rule_key.replace(".", "_"),
                                content=insert_text,
                                position=InsertionPosition(insert_position)
                                if insert_position in ("prepend", "append", "footer")
                                else InsertionPosition.FOOTER,
                                jurisdiction=rule.get("jurisdiction", state),
                            )
                        )

        return violations, insertions


# Singleton instance
rules_engine = ComplianceRulesEngine()
