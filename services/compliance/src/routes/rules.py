"""Compliance rules listing and lookup endpoints."""
import structlog
from fastapi import APIRouter, HTTPException, Query

from ..database import load_all_rules, load_state_signing_rules
from ..models import ComplianceRuleResponse, StateRulesResponse

logger = structlog.get_logger()

# All 50 US states + DC
VALID_STATE_CODES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
}

US_STATES = [
    {"code": "AL", "name": "Alabama"}, {"code": "AK", "name": "Alaska"},
    {"code": "AZ", "name": "Arizona"}, {"code": "AR", "name": "Arkansas"},
    {"code": "CA", "name": "California"}, {"code": "CO", "name": "Colorado"},
    {"code": "CT", "name": "Connecticut"}, {"code": "DE", "name": "Delaware"},
    {"code": "DC", "name": "District of Columbia"}, {"code": "FL", "name": "Florida"},
    {"code": "GA", "name": "Georgia"}, {"code": "HI", "name": "Hawaii"},
    {"code": "ID", "name": "Idaho"}, {"code": "IL", "name": "Illinois"},
    {"code": "IN", "name": "Indiana"}, {"code": "IA", "name": "Iowa"},
    {"code": "KS", "name": "Kansas"}, {"code": "KY", "name": "Kentucky"},
    {"code": "LA", "name": "Louisiana"}, {"code": "ME", "name": "Maine"},
    {"code": "MD", "name": "Maryland"}, {"code": "MA", "name": "Massachusetts"},
    {"code": "MI", "name": "Michigan"}, {"code": "MN", "name": "Minnesota"},
    {"code": "MS", "name": "Mississippi"}, {"code": "MO", "name": "Missouri"},
    {"code": "MT", "name": "Montana"}, {"code": "NE", "name": "Nebraska"},
    {"code": "NV", "name": "Nevada"}, {"code": "NH", "name": "New Hampshire"},
    {"code": "NJ", "name": "New Jersey"}, {"code": "NM", "name": "New Mexico"},
    {"code": "NY", "name": "New York"}, {"code": "NC", "name": "North Carolina"},
    {"code": "ND", "name": "North Dakota"}, {"code": "OH", "name": "Ohio"},
    {"code": "OK", "name": "Oklahoma"}, {"code": "OR", "name": "Oregon"},
    {"code": "PA", "name": "Pennsylvania"}, {"code": "RI", "name": "Rhode Island"},
    {"code": "SC", "name": "South Carolina"}, {"code": "SD", "name": "South Dakota"},
    {"code": "TN", "name": "Tennessee"}, {"code": "TX", "name": "Texas"},
    {"code": "UT", "name": "Utah"}, {"code": "VT", "name": "Vermont"},
    {"code": "VA", "name": "Virginia"}, {"code": "WA", "name": "Washington"},
    {"code": "WV", "name": "West Virginia"}, {"code": "WI", "name": "Wisconsin"},
    {"code": "WY", "name": "Wyoming"},
]

router = APIRouter(prefix="/api", tags=["compliance-rules"])


def _row_to_response(row: dict) -> ComplianceRuleResponse:
    """Convert a database row dict to a ComplianceRuleResponse."""
    return ComplianceRuleResponse(
        id=str(row["id"]),
        jurisdiction=row["jurisdiction"],
        category=row["category"],
        subcategory=row.get("subcategory", ""),
        rule_key=row["rule_key"],
        title=row["title"],
        description=row.get("description", ""),
        enforcement=row["enforcement"],
        parameters=row.get("parameters") or {},
        applies_to=row.get("applies_to") or [],
        effective_date=str(row.get("effective_date", "")),
        superseded_date=str(row["superseded_date"]) if row.get("superseded_date") else None,
        version=row.get("version", 1),
        source_reference=row.get("source_reference"),
    )


@router.get("/rules", response_model=list[ComplianceRuleResponse])
async def list_rules(
    jurisdiction: str | None = Query(None, description="Filter by jurisdiction (e.g., 'US', 'OR')"),
    category: str | None = Query(None, description="Filter by category (e.g., 'advertising')"),
) -> list[ComplianceRuleResponse]:
    """List all active compliance rules with optional filters."""
    try:
        rows = await load_all_rules(jurisdiction=jurisdiction, category=category)
        return [_row_to_response(row) for row in rows]
    except Exception as exc:
        logger.error("list_rules_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list compliance rules") from exc


@router.get("/rules/{state}", response_model=StateRulesResponse)
async def get_state_rules(state: str) -> StateRulesResponse:
    """Get compliance rules for a specific state plus federal rules.

    Returns both federal (US) and state-specific compliance rules.
    """
    state_code = state.upper()
    if state_code not in VALID_STATE_CODES:
        raise HTTPException(
            status_code=400,
            detail=f'"{state_code}" is not a valid US state code',
        )

    try:
        federal_rows = await load_all_rules(jurisdiction="US")
        state_rows = await load_all_rules(jurisdiction=state_code)

        return StateRulesResponse(
            federal=[_row_to_response(row) for row in federal_rows],
            state=[_row_to_response(row) for row in state_rows],
        )
    except Exception as exc:
        logger.error("get_state_rules_error", state=state_code, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to load state rules") from exc


@router.get("/states")
async def list_states() -> list[dict[str, str]]:
    """List all US states with codes and names."""
    return US_STATES


@router.get("/signing-rules/{state}")
async def get_signing_rules(state: str) -> list[dict]:
    """Get electronic signing rules for a specific state.

    Returns notarization, witness, and e-signature requirements for each
    document type in the jurisdiction.
    """
    state_code = state.upper()
    if state_code not in VALID_STATE_CODES:
        raise HTTPException(
            status_code=400,
            detail=f'"{state_code}" is not a valid US state code',
        )

    try:
        rows = await load_state_signing_rules(state_code)
        return rows
    except Exception as exc:
        logger.error("get_signing_rules_error", state=state_code, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to load signing rules") from exc
