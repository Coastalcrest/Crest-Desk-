-- ============================================================================
-- CrestDesk State Signing Rules Seed Data
-- ============================================================================
-- This file seeds the state_signing_rules table with jurisdiction-specific
-- rules governing electronic signatures, wet signature requirements, witness
-- and notary requirements, and record retention periods.
--
-- Coverage:
--   - Oregon (OR)  — primary jurisdiction, full rule set
--   - Washington (WA), California (CA), Texas (TX) — representative samples
--   - Federal (US)  — ESIGN Act baseline defaults
--
-- Document types align with the document_type values used in the
-- signing_envelopes and documents tables.
-- ============================================================================

BEGIN;

-- ============================================================================
-- OREGON (OR) — Full Rule Set
-- ============================================================================

-- --------------------------------------------------------------------------
-- OR: Purchase Agreement
-- Oregon Revised Statutes (ORS) 84.001 et seq. — Oregon UETA
-- E-signatures valid; no witness or notary requirement for standard agreements.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'transaction', 'purchase_agreement',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"ORS 84.004","note":"Oregon UETA adoption permits electronic signatures on purchase agreements. Parties must consent to electronic transactions per ORS 84.020."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Seller Disclosure (Property Condition Disclosure)
-- ORS 105.465 — Seller must provide property condition disclosure.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'disclosure', 'seller_disclosure',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"ORS 105.465","note":"Seller property condition disclosure may be signed electronically under Oregon UETA. Must be provided to buyer prior to acceptance of purchase agreement."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Lead-Based Paint Disclosure
-- Federal 42 U.S.C. 4852d + EPA 40 CFR 745 — applies to pre-1978 housing.
-- Oregon follows federal retention requirement of 3 years, but broker best
-- practice is 7 years for liability coverage.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'disclosure', 'lead_paint_disclosure',
  false, 0, false, false,
  false, true, true,
  7,
  '{"statute":"42 U.S.C. 4852d; 40 CFR 745","note":"Lead-based paint disclosure required for pre-1978 housing. E-signatures permitted per ESIGN Act. Federal minimum retention is 3 years; Oregon brokers should retain for 7 years per best practice."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Agency Disclosure
-- ORS 696.810 — Agents must disclose representation relationships.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'disclosure', 'agency_disclosure',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"ORS 696.810","note":"Initial agency disclosure must be provided at first substantive contact. E-signature permitted. Broker must retain for 6 years per ORS 696.280."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Power of Attorney
-- ORS 127.005 — Uniform Power of Attorney Act
-- WET SIGNATURE REQUIRED. Requires 2 witnesses and notarization.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'legal', 'power_of_attorney',
  true, 2, true, true,
  true, false, true,
  7,
  '{"statute":"ORS 127.005 et seq.","note":"Power of Attorney must be signed with wet signature, witnessed by 2 disinterested adults, and notarized. Oregon permits Remote Online Notarization (RON) under ORS 194.500. E-signatures NOT accepted for POA in Oregon real estate.","warnings":["Wet signature only","Two witnesses required","Notarization mandatory"]}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Deed (Warranty Deed, Bargain and Sale Deed, Quitclaim Deed)
-- ORS 93.010 — Conveyance of real property
-- WET SIGNATURE REQUIRED. Must be notarized for recording.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'conveyance', 'deed',
  false, 0, true, true,
  true, false, true,
  10,
  '{"statute":"ORS 93.010; ORS 205.234","note":"Deeds conveying real property must bear wet signatures and be notarized for recording with the county clerk. Oregon permits Remote Online Notarization (RON) under ORS 194.500. Electronic recording may be accepted by participating counties.","warnings":["Wet signature only","Notarization required for recording"]}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- OR: Closing Disclosure (TRID / TILA-RESPA)
-- Federal Regulation Z — 12 CFR 1026.19(f)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'OR', 'closing', 'closing_disclosure',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"12 CFR 1026.19(f); TRID","note":"Closing Disclosure must be provided 3 business days before consummation. E-signatures allowed per ESIGN Act with proper consent. Federal minimum retention is 5 years."}',
  '2024-01-01'
);

-- ============================================================================
-- WASHINGTON (WA) — Representative Sample
-- ============================================================================

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'WA', 'transaction', 'purchase_agreement',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"RCW 19.360","note":"Washington Electronic Authentication Act permits e-signatures on purchase agreements. Consent required."}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'WA', 'conveyance', 'deed',
  false, 0, true, true,
  true, false, true,
  10,
  '{"statute":"RCW 64.04.020","note":"Washington deeds must be acknowledged (notarized) for recording. Wet signature required. RON permitted under RCW 42.45.","warnings":["Wet signature only","Notarization required"]}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'WA', 'legal', 'power_of_attorney',
  true, 2, true, true,
  true, false, true,
  7,
  '{"statute":"RCW 11.125","note":"Washington Uniform Power of Attorney Act requires wet signature, notarization, and 2 witnesses.","warnings":["Wet signature only","Two witnesses required","Notarization mandatory"]}',
  '2024-01-01'
);

-- ============================================================================
-- CALIFORNIA (CA) — Representative Sample
-- ============================================================================

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'CA', 'transaction', 'purchase_agreement',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"Cal. Civ. Code 1633.1 (UETA)","note":"California UETA permits e-signatures on purchase agreements with consent of all parties."}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'CA', 'disclosure', 'seller_disclosure',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"Cal. Civ. Code 1102 et seq.","note":"Transfer Disclosure Statement (TDS) required. E-signatures permitted under California UETA."}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'CA', 'conveyance', 'deed',
  false, 0, true, false,
  true, false, true,
  10,
  '{"statute":"Cal. Civ. Code 1185","note":"Deeds must be acknowledged (notarized) for recording. California does NOT yet permit Remote Online Notarization. Wet signature required.","warnings":["Wet signature only","Notarization required","RON not permitted in California"]}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'CA', 'legal', 'power_of_attorney',
  true, 2, true, false,
  true, false, true,
  7,
  '{"statute":"Cal. Prob. Code 4121","note":"Power of Attorney requires wet signature, notarization, and 2 witnesses. RON not yet permitted in California.","warnings":["Wet signature only","Two witnesses required","Notarization mandatory","RON not permitted"]}',
  '2024-01-01'
);

-- ============================================================================
-- TEXAS (TX) — Representative Sample
-- ============================================================================

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'TX', 'transaction', 'purchase_agreement',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"Tex. Bus. & Com. Code 322 (UETA)","note":"Texas UETA permits e-signatures on purchase agreements. TREC promulgated forms may be signed electronically."}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'TX', 'disclosure', 'seller_disclosure',
  false, 0, false, false,
  false, true, true,
  6,
  '{"statute":"Tex. Prop. Code 5.008","note":"Seller disclosure required. E-signatures permitted under Texas UETA."}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'TX', 'conveyance', 'deed',
  false, 0, true, true,
  true, false, true,
  10,
  '{"statute":"Tex. Prop. Code 12.001","note":"Deeds must be acknowledged (notarized) for recording. Texas permits Remote Online Notarization under Gov. Code 406.101. Wet signature required.","warnings":["Wet signature only","Notarization required"]}',
  '2024-01-01'
);

INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'TX', 'legal', 'power_of_attorney',
  true, 2, true, true,
  true, false, true,
  7,
  '{"statute":"Tex. Est. Code 751","note":"Texas Durable Power of Attorney Act requires wet signature, notarization, and 2 witnesses.","warnings":["Wet signature only","Two witnesses required","Notarization mandatory"]}',
  '2024-01-01'
);

-- ============================================================================
-- FEDERAL (US) — ESIGN Act Baseline Defaults
-- ============================================================================
-- The Electronic Signatures in Global and National Commerce Act (ESIGN)
-- 15 U.S.C. 7001 establishes federal baseline for all document types.
-- These rows serve as fallback defaults when no state-specific rule exists.
-- ============================================================================

-- --------------------------------------------------------------------------
-- US: Purchase Agreement (Federal Baseline)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'transaction', 'purchase_agreement',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"15 U.S.C. 7001 (ESIGN Act)","note":"Federal ESIGN Act permits electronic signatures on purchase agreements. Signer must affirmatively consent to electronic transactions. State rules may impose additional requirements."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Seller Disclosure (Federal Baseline)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'disclosure', 'seller_disclosure',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"15 U.S.C. 7001 (ESIGN Act)","note":"Federal baseline allows e-signatures on disclosure documents. State-specific disclosure requirements take precedence."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Lead-Based Paint Disclosure (Federal Requirement)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'disclosure', 'lead_paint_disclosure',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"42 U.S.C. 4852d; 40 CFR 745.107","note":"Federal lead-based paint disclosure required for all pre-1978 residential housing sales and leases. E-signatures allowed per ESIGN Act. Minimum 3-year retention federally; states may require longer."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Agency Disclosure (Federal Baseline)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'disclosure', 'agency_disclosure',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"15 U.S.C. 7001 (ESIGN Act)","note":"Federal baseline for agency disclosures. Specific requirements are primarily state-governed."}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Power of Attorney (Federal Baseline)
-- Note: ESIGN Act specifically EXCLUDES certain documents including wills,
-- family law, and court orders. POA is NOT excluded by ESIGN but most states
-- require wet signatures for real property POA.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'legal', 'power_of_attorney',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"15 U.S.C. 7001 (ESIGN Act)","note":"Federal ESIGN Act does not exclude Power of Attorney documents. However, most states require wet signatures, witnesses, and notarization for POA used in real property transactions. Always defer to state-specific rules.","warnings":["Check state requirements — most states require wet signature for real property POA"]}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Deed (Federal Baseline)
-- Note: Deeds are primarily governed by state law. ESIGN does not preempt
-- state recording requirements.
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'conveyance', 'deed',
  false, 0, false, false,
  true, false, true,
  5,
  '{"statute":"State law governs; ESIGN 15 U.S.C. 7001","note":"Deed recording is governed by state law. Most states require wet signatures and notarization for recording. ESIGN does not preempt state recording statutes. Always use state-specific rules for deeds.","warnings":["Deeds are state-governed","Most states require wet signature and notarization"]}',
  '2024-01-01'
);

-- --------------------------------------------------------------------------
-- US: Closing Disclosure (Federal — TRID / Reg Z)
-- --------------------------------------------------------------------------
INSERT INTO state_signing_rules (
  jurisdiction, rule_category, document_type,
  requires_witness, witness_count, requires_notary, remote_notary_allowed,
  requires_wet_signature, e_signature_allowed, signer_consent_required,
  record_retention_years, details, effective_date
) VALUES (
  'US', 'closing', 'closing_disclosure',
  false, 0, false, false,
  false, true, true,
  5,
  '{"statute":"12 CFR 1026.19(f); 15 U.S.C. 7001","note":"Closing Disclosure governed by TRID (TILA-RESPA Integrated Disclosure). Must be provided 3 business days before consummation. E-signatures permitted with ESIGN Act consent. 5-year federal retention minimum."}',
  '2024-01-01'
);

COMMIT;
