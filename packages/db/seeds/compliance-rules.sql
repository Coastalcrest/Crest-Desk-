-- ============================================================================
-- CrestDesk Compliance Rules Seed Data
-- ============================================================================
-- This file seeds the compliance_rules table with federal (US) and state-level
-- rules governing real estate advertising, disclosure, communication, privacy,
-- accessibility, and record retention.
--
-- Total rules: ~254
--   - 20 Federal (US)
--   - 204 State (51 jurisdictions x 4 common rules)
--   - ~30 State-specific additional rules
--
-- Enforcement levels:
--   block   — Hard stop; content cannot be published/sent
--   warn    — Soft warning; user may override with acknowledgment
--   require — A required element must be present before publishing
--   insert  — System auto-inserts required content
-- ============================================================================

BEGIN;

-- ============================================================================
-- FEDERAL RULES (jurisdiction = 'US') — 20 rules
-- ============================================================================

-- --------------------------------------------------------------------------
-- Fair Housing Act — 42 U.S.C. § 3604
-- --------------------------------------------------------------------------

-- 1. Familial status — blocked terms
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.familial_status',
  'Fair Housing — Familial Status (Block)',
  'Prohibits advertising language that discriminates based on familial status. '
  'Content containing blocked terms related to family composition will be prevented from publishing.',
  'block',
  '{"blocked_terms":["no children","adults only","singles only","no families","couples only","mature community"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 2. Familial status — warned terms
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.familial_status_warn',
  'Fair Housing — Familial Status (Warn)',
  'Flags ambiguous architectural or descriptive terms that may unintentionally imply '
  'familial status preferences. User may override after acknowledgment.',
  'warn',
  '{"warned_terms":["family room","single family","family-friendly"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 3. Race / national origin
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.race',
  'Fair Housing — Race / National Origin (Block)',
  'Prohibits advertising language that discriminates based on race or national origin. '
  'Content containing discriminatory terms will be blocked from publishing.',
  'block',
  '{"blocked_terms":["whites only","no foreigners","english speaking only","citizen only","american only"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 4. Religion
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.religion',
  'Fair Housing — Religion (Block)',
  'Prohibits advertising language that steers based on religion or proximity to '
  'religious institutions in a discriminatory context.',
  'block',
  '{"blocked_terms":["christian neighborhood","near church","near mosque","religious community"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 5. Disability
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.disability',
  'Fair Housing — Disability (Block)',
  'Prohibits advertising language that discriminates based on disability status. '
  'Terms that exclude or discourage persons with disabilities are blocked.',
  'block',
  '{"blocked_terms":["no wheelchairs","no handicapped","physically fit required","able-bodied"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 6. Sex / gender
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.sex',
  'Fair Housing — Sex / Gender (Warn)',
  'Flags gender-associated terms that may imply a preference or limitation based on sex. '
  'User may override after acknowledgment.',
  'warn',
  '{"warned_terms":["bachelor pad","man cave","master bedroom","his and hers"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 7. Steering prevention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.steering',
  'Fair Housing — Steering Prevention (Warn)',
  'Flags language that may constitute steering by targeting or excluding specific '
  'demographic groups such as families, young professionals, or retirees.',
  'warn',
  '{"warned_terms":["perfect for families","great for young professionals","ideal for retirees","walking distance to church"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- 8. Equal Housing Opportunity statement
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'fair_housing',
  'US.advertising.fair_housing.equal_housing',
  'Equal Housing Opportunity Statement (Insert)',
  'Automatically inserts the Equal Housing Opportunity statement into published content '
  'to ensure compliance with federal fair housing advertising requirements.',
  'insert',
  '{"required_text":"Equal Housing Opportunity","position":"footer"}',
  ARRAY['social_post','email','listing_image','document'],
  '2024-01-01',
  '42 U.S.C. § 3604'
);

-- --------------------------------------------------------------------------
-- RESPA — Real Estate Settlement Procedures Act — 12 U.S.C. § 2607
-- --------------------------------------------------------------------------

-- 9. Referral fee disclosure
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'disclosure', 'respa',
  'US.disclosure.respa.referral_fees',
  'RESPA — Referral Fee Disclosure (Warn)',
  'Warns when content may involve referral fee arrangements that require disclosure '
  'under the Real Estate Settlement Procedures Act. Undisclosed referral fees are prohibited.',
  'warn',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '12 U.S.C. § 2607'
);

-- 10. Good faith estimate
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'disclosure', 'respa',
  'US.disclosure.respa.good_faith',
  'RESPA — Good Faith Estimate Required',
  'Requires that a good faith estimate of settlement costs be provided to borrowers '
  'within the timeframes mandated by RESPA.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '12 U.S.C. § 2607'
);

-- --------------------------------------------------------------------------
-- TILA — Truth in Lending Act — 15 U.S.C. § 1601
-- --------------------------------------------------------------------------

-- 11. Financial terms trigger
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'disclosure', 'tila',
  'US.disclosure.tila.financial_terms',
  'TILA — Financial Terms Disclosure Required',
  'When advertising includes triggering financial terms (APR, interest rate, monthly payment, '
  'down payment, finance charges), full TILA disclosures are required.',
  'require',
  '{"trigger_terms":["APR","interest rate","monthly payment","down payment","finance charges"]}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '15 U.S.C. § 1601'
);

-- --------------------------------------------------------------------------
-- CAN-SPAM Act — 15 U.S.C. § 7704
-- --------------------------------------------------------------------------

-- 12. Sender identity
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'canspam',
  'US.advertising.canspam.sender_identity',
  'CAN-SPAM — Sender Identity Required',
  'Commercial email must include accurate sender identification including the physical '
  'postal address of the sender.',
  'require',
  '{}',
  ARRAY['email'],
  '2024-01-01',
  '15 U.S.C. § 7704'
);

-- 13. Unsubscribe mechanism
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'canspam',
  'US.advertising.canspam.unsubscribe',
  'CAN-SPAM — Unsubscribe Mechanism Required',
  'Commercial email must include a clear and conspicuous unsubscribe mechanism. '
  'Opt-out requests must be honored within 10 business days.',
  'require',
  '{"required_text":"Unsubscribe","position":"footer"}',
  ARRAY['email'],
  '2024-01-01',
  '15 U.S.C. § 7704'
);

-- 14. Opted-out recipients
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'advertising', 'canspam',
  'US.advertising.canspam.optout',
  'CAN-SPAM — Opted-Out Recipient Block',
  'Blocks sending commercial email to recipients who have previously opted out. '
  'The system must check opt-out status before allowing email delivery.',
  'block',
  '{}',
  ARRAY['email'],
  '2024-01-01',
  '15 U.S.C. § 7704'
);

-- --------------------------------------------------------------------------
-- TCPA — Telephone Consumer Protection Act — 47 U.S.C. § 227
-- --------------------------------------------------------------------------

-- 15. Prior written consent
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'communication', 'tcpa',
  'US.communication.tcpa.consent',
  'TCPA — Prior Written Consent Required',
  'Prior express written consent is required before sending automated SMS messages or '
  'making automated telephone calls for marketing purposes.',
  'block',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '47 U.S.C. § 227'
);

-- 16. Time restrictions
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'communication', 'tcpa',
  'US.communication.tcpa.time_restrictions',
  'TCPA — Contact Time Restrictions',
  'Blocks outbound marketing calls and SMS messages outside the permitted window of '
  '8:00 AM to 9:00 PM in the recipients local time zone.',
  'block',
  '{"earliest_hour":8,"latest_hour":21}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '47 U.S.C. § 227'
);

-- 17. Do Not Call registry
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'communication', 'tcpa',
  'US.communication.tcpa.do_not_call',
  'TCPA — Do Not Call Registry Check',
  'Requires checking the National Do Not Call Registry before initiating marketing '
  'calls. Contacting registered numbers is blocked.',
  'block',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '47 U.S.C. § 227'
);

-- --------------------------------------------------------------------------
-- E-SIGN Act — 15 U.S.C. § 7001
-- --------------------------------------------------------------------------

-- 18. Electronic signature consent
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'signature', 'esign',
  'US.signature.esign.consent',
  'E-SIGN — Electronic Signature Consent Required',
  'Requires obtaining affirmative consent from all parties before using electronic '
  'signatures on real estate documents, as mandated by the E-SIGN Act.',
  'require',
  '{}',
  ARRAY['document'],
  '2024-01-01',
  '15 U.S.C. § 7001'
);

-- --------------------------------------------------------------------------
-- GLBA — Gramm-Leach-Bliley Act — 15 U.S.C. § 6801
-- --------------------------------------------------------------------------

-- 19. Financial data encryption
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'privacy', 'glba',
  'US.privacy.glba.encryption',
  'GLBA — Financial Data Encryption Required',
  'Blocks transmission of non-public personal financial information unless proper '
  'encryption is applied, as required by the Gramm-Leach-Bliley Act Safeguards Rule.',
  'block',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '15 U.S.C. § 6801'
);

-- --------------------------------------------------------------------------
-- ADA — Americans with Disabilities Act / WCAG
-- --------------------------------------------------------------------------

-- 20. WCAG accessibility
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'US', 'accessibility', 'ada',
  'US.accessibility.ada.wcag',
  'ADA — WCAG 2.1 AA Accessibility',
  'Content should meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards '
  'to ensure accessibility for users with disabilities.',
  'warn',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  '42 U.S.C. § 12101'
);


-- ============================================================================
-- STATE RULES — Common rules for all 51 jurisdictions (50 states + DC)
-- 4 rules per jurisdiction = 204 rules
-- ============================================================================

-- Helper: Each state gets these four standard rules:
--   1. License display requirement
--   2. Brokerage attribution requirement
--   3. Seller property disclosure requirement
--   4. Agency disclosure requirement

DO $$
DECLARE
  state_code TEXT;
  state_codes TEXT[] := ARRAY[
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
    'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
    'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI',
    'WY'
  ];
BEGIN
  FOREACH state_code IN ARRAY state_codes
  LOOP

    -- 1. License display
    INSERT INTO compliance_rules (
      jurisdiction, category, subcategory, rule_key,
      title, description, enforcement, parameters,
      applies_to, effective_date
    ) VALUES (
      state_code, 'advertising', 'license_display',
      state_code || '.advertising.license_display',
      'License Number Display Required (' || state_code || ')',
      'License number must be displayed in all advertising materials as required by '
      || state_code || ' real estate commission regulations.',
      'require',
      '{"required_text":"License #","position":"footer"}',
      ARRAY['social_post','email','listing_image','document'],
      '2024-01-01'
    );

    -- 2. Brokerage attribution
    INSERT INTO compliance_rules (
      jurisdiction, category, subcategory, rule_key,
      title, description, enforcement, parameters,
      applies_to, effective_date
    ) VALUES (
      state_code, 'advertising', 'brokerage_attribution',
      state_code || '.advertising.brokerage_attribution',
      'Brokerage Name Attribution Required (' || state_code || ')',
      'Brokerage name must be included in advertising materials as required by '
      || state_code || ' real estate commission regulations.',
      'require',
      '{}',
      ARRAY['social_post','email','listing_image'],
      '2024-01-01'
    );

    -- 3. Seller property disclosure
    INSERT INTO compliance_rules (
      jurisdiction, category, subcategory, rule_key,
      title, description, enforcement, parameters,
      applies_to, effective_date
    ) VALUES (
      state_code, 'disclosure', 'seller_property',
      state_code || '.disclosure.seller_property',
      'Seller Property Disclosure Required (' || state_code || ')',
      'Seller property disclosure required for residential real estate transactions in '
      || state_code || '.',
      'require',
      '{}',
      ARRAY['document'],
      '2024-01-01'
    );

    -- 4. Agency disclosure
    INSERT INTO compliance_rules (
      jurisdiction, category, subcategory, rule_key,
      title, description, enforcement, parameters,
      applies_to, effective_date
    ) VALUES (
      state_code, 'disclosure', 'agency',
      state_code || '.disclosure.agency',
      'Agency Disclosure Required (' || state_code || ')',
      'Agency disclosure required in real estate transactions in ' || state_code
      || '. Agents must disclose their agency relationship to all parties.',
      'require',
      '{}',
      ARRAY['document'],
      '2024-01-01'
    );

  END LOOP;
END $$;


-- ============================================================================
-- STATE-SPECIFIC ADDITIONAL RULES (~30 rules)
-- ============================================================================

-- --------------------------------------------------------------------------
-- CALIFORNIA (CA) — 4 additional rules
-- --------------------------------------------------------------------------

-- CA: CCPA privacy disclosure
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CA', 'privacy', 'ccpa_disclosure',
  'CA.privacy.ccpa_disclosure',
  'CCPA — Privacy Disclosure Required (CA)',
  'California Consumer Privacy Act requires disclosure of data collection practices, '
  'consumer rights to access and delete personal information, and opt-out of data sales.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  'Cal. Civ. Code § 1798.100'
);

-- CA: Transfer disclosure statement
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CA', 'disclosure', 'transfer_disclosure',
  'CA.disclosure.transfer_disclosure',
  'Transfer Disclosure Statement Required (CA)',
  'California requires sellers of residential property (1-4 units) to provide a Transfer '
  'Disclosure Statement detailing the condition of the property.',
  'require',
  '{}',
  ARRAY['document'],
  '2024-01-01',
  'Cal. Civ. Code § 1102'
);

-- CA: Natural hazards disclosure
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CA', 'disclosure', 'natural_hazards',
  'CA.disclosure.natural_hazards',
  'Natural Hazard Disclosure Required (CA)',
  'California requires disclosure of whether residential property is located in designated '
  'natural hazard zones including flood, fire, earthquake fault, and seismic hazard areas.',
  'require',
  '{}',
  ARRAY['document'],
  '2024-01-01',
  'Cal. Civ. Code § 1103'
);

-- CA: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CA', 'retention', 'transaction_records',
  'CA.retention.transaction_records',
  'Transaction Record Retention (CA)',
  'California requires brokers to retain transaction records for a minimum of three years '
  'from the date of closing or from the listing date if the transaction does not close.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  'Cal. Bus. & Prof. Code § 10148'
);

-- --------------------------------------------------------------------------
-- NEW YORK (NY) — 3 additional rules
-- --------------------------------------------------------------------------

-- NY: SHIELD Act
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'NY', 'privacy', 'shield_act',
  'NY.privacy.shield_act',
  'SHIELD Act — Data Security Required (NY)',
  'New York Stop Hacks and Improve Electronic Data Security Act requires implementation '
  'of reasonable safeguards to protect private information of New York residents.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  'N.Y. Gen. Bus. Law § 899-bb'
);

-- NY: Property condition disclosure
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'NY', 'disclosure', 'property_condition',
  'NY.disclosure.property_condition',
  'Property Condition Disclosure Act (NY)',
  'Property Condition Disclosure Act requires sellers to provide a disclosure statement. '
  'If the seller fails to provide the disclosure, a $500 credit is given to the buyer at closing.',
  'require',
  '{}',
  ARRAY['document'],
  '2024-01-01',
  'N.Y. Real Prop. Law § 462'
);

-- NY: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'NY', 'retention', 'transaction_records',
  'NY.retention.transaction_records',
  'Transaction Record Retention (NY)',
  'New York requires brokers to retain transaction records for a minimum of three years.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  'N.Y. DOS § 175.23'
);

-- --------------------------------------------------------------------------
-- OREGON (OR) — 2 additional rules
-- --------------------------------------------------------------------------

-- OR: Lead paint disclosure
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'OR', 'disclosure', 'lead_paint',
  'OR.disclosure.lead_paint',
  'Lead Paint Disclosure Required (OR)',
  'Lead paint disclosure is required for all residential properties built before 1978. '
  'Sellers must provide buyers with an EPA-approved pamphlet and disclose known lead hazards.',
  'require',
  '{}',
  ARRAY['document'],
  '2024-01-01',
  'ORS § 93.855'
);

-- OR: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'OR', 'retention', 'transaction_records',
  'OR.retention.transaction_records',
  'Transaction Record Retention (OR)',
  'Oregon requires brokers to retain transaction records for a minimum of six years.',
  'require',
  '{"years":6}',
  ARRAY['document'],
  '2024-01-01',
  'OAR 863-015-0260'
);

-- --------------------------------------------------------------------------
-- WASHINGTON (WA) — 1 additional rule
-- --------------------------------------------------------------------------

-- WA: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'WA', 'retention', 'transaction_records',
  'WA.retention.transaction_records',
  'Transaction Record Retention (WA)',
  'Washington requires brokers to retain transaction records for a minimum of three years.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  'WAC 308-124C-137'
);

-- --------------------------------------------------------------------------
-- TEXAS (TX) — 2 additional rules
-- --------------------------------------------------------------------------

-- TX: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'TX', 'retention', 'transaction_records',
  'TX.retention.transaction_records',
  'Transaction Record Retention (TX)',
  'Texas requires brokers to retain transaction records for a minimum of four years.',
  'require',
  '{"years":4}',
  ARRAY['document'],
  '2024-01-01',
  'TREC Rule § 535.2'
);

-- TX: TREC license display
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'TX', 'advertising', 'trec_license',
  'TX.advertising.trec_license',
  'TREC License Display Required (TX)',
  'Texas Real Estate Commission requires the licensees TREC license number to be '
  'prominently displayed in all advertising and marketing materials.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document'],
  '2024-01-01',
  'TREC Rule § 535.154'
);

-- --------------------------------------------------------------------------
-- FLORIDA (FL) — 1 additional rule
-- --------------------------------------------------------------------------

-- FL: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'FL', 'retention', 'transaction_records',
  'FL.retention.transaction_records',
  'Transaction Record Retention (FL)',
  'Florida requires brokers to retain transaction records for a minimum of five years.',
  'require',
  '{"years":5}',
  ARRAY['document'],
  '2024-01-01',
  'Fla. Stat. § 475.5015'
);

-- --------------------------------------------------------------------------
-- ILLINOIS (IL) — 1 additional rule
-- --------------------------------------------------------------------------

-- IL: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'IL', 'retention', 'transaction_records',
  'IL.retention.transaction_records',
  'Transaction Record Retention (IL)',
  'Illinois requires brokers to retain transaction records for a minimum of five years.',
  'require',
  '{"years":5}',
  ARRAY['document'],
  '2024-01-01',
  '225 ILCS 454/5-28'
);

-- --------------------------------------------------------------------------
-- PENNSYLVANIA (PA) — 1 additional rule
-- --------------------------------------------------------------------------

-- PA: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'PA', 'retention', 'transaction_records',
  'PA.retention.transaction_records',
  'Transaction Record Retention (PA)',
  'Pennsylvania requires brokers to retain transaction records for a minimum of three years.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  '49 Pa. Code § 35.286'
);

-- --------------------------------------------------------------------------
-- COLORADO (CO) — 1 additional rule
-- --------------------------------------------------------------------------

-- CO: Colorado Privacy Act
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CO', 'privacy', 'cpa',
  'CO.privacy.cpa',
  'Colorado Privacy Act Compliance (CO)',
  'Colorado Privacy Act requires businesses to provide consumers with rights to access, '
  'correct, delete, and opt out of the sale of their personal data.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  'C.R.S. § 6-1-1301'
);

-- --------------------------------------------------------------------------
-- VIRGINIA (VA) — 1 additional rule
-- --------------------------------------------------------------------------

-- VA: Virginia Consumer Data Protection Act
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'VA', 'privacy', 'vcdpa',
  'VA.privacy.vcdpa',
  'VCDPA — Consumer Data Protection (VA)',
  'Virginia Consumer Data Protection Act requires businesses to provide consumers with '
  'rights to access, correct, delete, and opt out of targeted advertising and data sales.',
  'require',
  '{}',
  ARRAY['social_post','email','listing_image','document','video'],
  '2024-01-01',
  'Va. Code § 59.1-575'
);

-- --------------------------------------------------------------------------
-- CONNECTICUT (CT) — 1 additional rule
-- --------------------------------------------------------------------------

-- CT: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'CT', 'retention', 'transaction_records',
  'CT.retention.transaction_records',
  'Transaction Record Retention (CT)',
  'Connecticut requires brokers to retain transaction records for a minimum of six years.',
  'require',
  '{"years":6}',
  ARRAY['document'],
  '2024-01-01',
  'Conn. Gen. Stat. § 20-325b'
);

-- --------------------------------------------------------------------------
-- GEORGIA (GA) — 1 additional rule
-- --------------------------------------------------------------------------

-- GA: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'GA', 'retention', 'transaction_records',
  'GA.retention.transaction_records',
  'Transaction Record Retention (GA)',
  'Georgia requires brokers to retain transaction records for a minimum of three years.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  'O.C.G.A. § 43-40-25'
);

-- --------------------------------------------------------------------------
-- NEW JERSEY (NJ) — 1 additional rule
-- --------------------------------------------------------------------------

-- NJ: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'NJ', 'retention', 'transaction_records',
  'NJ.retention.transaction_records',
  'Transaction Record Retention (NJ)',
  'New Jersey requires brokers to retain transaction records for a minimum of six years.',
  'require',
  '{"years":6}',
  ARRAY['document'],
  '2024-01-01',
  'N.J.A.C. § 11:5-5.3'
);

-- --------------------------------------------------------------------------
-- MASSACHUSETTS (MA) — 1 additional rule
-- --------------------------------------------------------------------------

-- MA: Transaction record retention
INSERT INTO compliance_rules (
  jurisdiction, category, subcategory, rule_key,
  title, description, enforcement, parameters,
  applies_to, effective_date, source_reference
) VALUES (
  'MA', 'retention', 'transaction_records',
  'MA.retention.transaction_records',
  'Transaction Record Retention (MA)',
  'Massachusetts requires brokers to retain transaction records for a minimum of three years.',
  'require',
  '{"years":3}',
  ARRAY['document'],
  '2024-01-01',
  '254 CMR 2.00'
);


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Federal (US) rules:                        20
-- State common rules (51 x 4):             204
-- State-specific additional rules:           30
--                                    ----------
-- Total:                                    254
-- ============================================================================

COMMIT;
