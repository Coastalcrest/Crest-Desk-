"""Async database client for loading compliance rules."""
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

logger = structlog.get_logger()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncSession:
    """Get a database session."""
    async with async_session() as session:
        yield session


async def check_database_health() -> bool:
    """Check if the database connection is healthy."""
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception as exc:
        logger.error("database_health_check_failed", error=str(exc))
        return False


async def load_rules_for_jurisdictions(
    jurisdictions: list[str],
    content_type: str | None = None,
) -> list[dict]:
    """Load active compliance rules for given jurisdictions.

    Args:
        jurisdictions: List of jurisdiction codes (e.g., ['US', 'OR']).
        content_type: Optional content type filter.

    Returns:
        List of rule dictionaries.
    """
    try:
        async with async_session() as session:
            query = """
                SELECT id, jurisdiction, category, subcategory, rule_key,
                       title, description, enforcement, parameters,
                       applies_to, effective_date, superseded_date,
                       version, source_reference
                FROM compliance_rules
                WHERE jurisdiction = ANY(:jurisdictions)
                  AND superseded_date IS NULL
            """
            params: dict = {"jurisdictions": jurisdictions}

            if content_type:
                query += " AND :content_type = ANY(applies_to)"
                params["content_type"] = content_type

            query += " ORDER BY jurisdiction, category, rule_key"

            result = await session.execute(text(query), params)
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    except Exception as exc:
        logger.error("load_rules_failed", jurisdictions=jurisdictions, error=str(exc))
        return []


async def load_all_rules(
    jurisdiction: str | None = None,
    category: str | None = None,
) -> list[dict]:
    """Load all active compliance rules with optional filters.

    Args:
        jurisdiction: Optional jurisdiction filter.
        category: Optional category filter.

    Returns:
        List of rule dictionaries.
    """
    try:
        async with async_session() as session:
            query = """
                SELECT id, jurisdiction, category, subcategory, rule_key,
                       title, description, enforcement, parameters,
                       applies_to, effective_date, superseded_date,
                       version, source_reference
                FROM compliance_rules
                WHERE superseded_date IS NULL
            """
            params: dict = {}

            if jurisdiction:
                query += " AND jurisdiction = :jurisdiction"
                params["jurisdiction"] = jurisdiction.upper()

            if category:
                query += " AND category = :category"
                params["category"] = category

            query += " ORDER BY jurisdiction, category, rule_key"

            result = await session.execute(text(query), params)
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    except Exception as exc:
        logger.error("load_all_rules_failed", error=str(exc))
        return []


async def load_state_signing_rules(state: str) -> list[dict]:
    """Load state signing rules for a jurisdiction.

    Args:
        state: Two-letter state code.

    Returns:
        List of signing rule dictionaries.
    """
    try:
        async with async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, jurisdiction, rule_category, document_type,
                           requires_witness, witness_count, requires_notary,
                           remote_notary_allowed, requires_wet_signature,
                           e_signature_allowed, signer_consent_required,
                           record_retention_years, details,
                           effective_date, superseded_date
                    FROM state_signing_rules
                    WHERE jurisdiction = :state
                      AND superseded_date IS NULL
                    ORDER BY rule_category, document_type
                """),
                {"state": state.upper()},
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    except Exception as exc:
        logger.error("load_signing_rules_failed", state=state, error=str(exc))
        return []
