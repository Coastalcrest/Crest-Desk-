# ADR 0005: Compliance Engine as Architectural Foundation
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk operates in the real estate industry, which is one of the most heavily regulated sectors in the United States. The platform must comply with a complex web of overlapping regulations:

- **Federal**: Fair Housing Act, RESPA (Real Estate Settlement Procedures Act), ESIGN Act, CAN-SPAM Act, TCPA (Telephone Consumer Protection Act), GLBA (Gramm-Leach-Bliley Act).
- **State-specific**: All 50 states have their own real estate commission rules, advertising requirements, disclosure obligations, and communication restrictions.
- **MLS rules**: Each of the 500+ MLS systems has its own data display and attribution requirements.
- **Brokerage policies**: Individual brokerages layer their own compliance requirements on top.

Violations carry severe consequences: Fair Housing violations can result in $100K+ fines, TCPA violations allow $500-$1,500 per unsolicited text/call, and RESPA violations can lead to criminal penalties.

Many platforms treat compliance as a feature or add-on that can be toggled. This approach fails because a single non-compliant message can expose the brokerage to significant legal liability.

## Decision
Compliance is the architectural foundation of CrestDesk, not a bolt-on feature. All outbound content — emails, SMS, marketing materials, listing descriptions, advertisements — must pass through the compliance engine before delivery. There is no bypass.

- The compliance engine is a dedicated Python service with a rules engine that evaluates content against applicable regulations.
- Rules are organized in a strict hierarchy: **Federal > State > MLS > Brokerage**. When rules conflict, the stricter rule always wins.
- All 50 states are pre-loaded with their specific requirements at launch. The system does not ship with "we'll add your state later."
- Every compliance check produces an immutable audit record: what was checked, which rules applied, what passed, what was modified or blocked, and the timestamp.
- Content that fails compliance is either auto-corrected (e.g., adding required disclosures) or blocked with a clear explanation to the user.
- The compliance engine exposes a synchronous API for real-time checks (before sending) and an asynchronous API for batch validation (existing content audits).
- Rule updates are versioned and applied without code deployments via a rule configuration system.

## Consequences

**Positive:**
- Legal protection for brokerages — the platform guarantees compliant communications.
- Differentiator from competitors who treat compliance as optional.
- Audit trail satisfies regulatory inquiries and E&O insurance requirements.
- Agents cannot accidentally send non-compliant content, reducing brokerage liability.
- Rule hierarchy ensures the most restrictive applicable rule always applies, eliminating ambiguity.
- All 50 states supported from day one — no geographic limitations on sales.

**Negative:**
- Every outbound message has added latency from the compliance check (target: <100ms p99).
- The compliance engine is a single point of failure for all outbound communications. Mitigated with high availability deployment and a fail-closed design (if compliance cannot be reached, content is queued, not sent).
- Maintaining rules for all 50 states requires ongoing legal review and rule updates. A compliance operations role is needed.
- Agents may find the system restrictive when content is blocked. Clear, actionable error messages are critical for user acceptance.
- Complex rule interactions (e.g., Federal Fair Housing + California DRE + local MLS) require extensive testing. A comprehensive compliance test suite with real-world scenarios is mandatory.
- The fail-closed design means a compliance outage delays all communications. This is an intentional trade-off: delayed communication is better than non-compliant communication.
