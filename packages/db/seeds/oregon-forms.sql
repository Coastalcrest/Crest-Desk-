-- ============================================================================
-- CrestDesk Oregon Real Estate Form Templates Seed Data
-- ============================================================================
-- This file seeds the forms table with Oregon-specific real estate form
-- templates used statewide. These are system forms available to all tenants.
--
-- Total forms: 10
--   1. Oregon Purchase Agreement
--   2. Oregon Seller Property Condition Disclosure (ORS 93.275)
--   3. Oregon Lead-Based Paint Disclosure (ORS 93.705)
--   4. Oregon Agency Disclosure (ORS 696.600)
--   5. Oregon Buyer Information Sheet
--   6. Oregon HOA Disclosure Addendum
--   7. Oregon Inspection Addendum
--   8. Oregon Financing Addendum
--   9. Oregon Counter Offer
--  10. Oregon Post-Inspection Repairs Addendum
--
-- All forms use:
--   is_system_form = true
--   tenant_id      = NULL
--   jurisdiction    = 'OR'
--   version         = 1
--   html_template   = HTML body with {{placeholder}} fields
--   json_schema     = field definitions (type, label, required, etc.)
--   required_fields = text[] of field keys that must be populated before signing
--   conditional_fields = jsonb visibility rules
--   clause_library  = jsonb pre-written clause snippets
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Oregon Purchase Agreement
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/purchase_agreement_v1',
  'Oregon Residential Purchase Agreement',
  'agreement',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="parties">
  <h2>1. Parties</h2>
  <div class="field-row">
    <label>Buyer(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
  <div class="field-row">
    <label>Buyer Agent:</label>
    <span class="field">{{buyer_agent_name}}</span>
    <label>Brokerage:</label>
    <span class="field">{{buyer_brokerage}}</span>
  </div>
  <div class="field-row">
    <label>Seller Agent:</label>
    <span class="field">{{seller_agent_name}}</span>
    <label>Brokerage:</label>
    <span class="field">{{seller_brokerage}}</span>
  </div>
</section>

<section class="form-section" data-section="property">
  <h2>2. Property</h2>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>City:</label>
    <span class="field">{{property_city}}</span>
    <label>County:</label>
    <span class="field">{{property_county}}</span>
    <label>Zip:</label>
    <span class="field">{{property_zip}}</span>
  </div>
  <div class="field-row">
    <label>Tax Lot / Parcel ID:</label>
    <span class="field">{{tax_lot_id}}</span>
  </div>
  <div class="field-row">
    <label>Legal Description:</label>
    <span class="field">{{legal_description}}</span>
  </div>
</section>

<section class="form-section" data-section="price_terms">
  <h2>3. Price &amp; Terms</h2>
  <div class="field-row">
    <label>Purchase Price:</label>
    <span class="field">$&thinsp;{{purchase_price}}</span>
  </div>
  <div class="field-row">
    <label>Earnest Money Amount:</label>
    <span class="field">$&thinsp;{{earnest_money_amount}}</span>
    <label>Held by:</label>
    <span class="field">{{earnest_money_holder}}</span>
  </div>
  <div class="field-row">
    <label>Financing Type:</label>
    <span class="field">{{financing_type}}</span>
  </div>
  <div class="conditional-block" data-condition="financing_type != ''cash''">
    <div class="field-row">
      <label>Loan Type:</label>
      <span class="field">{{loan_type}}</span>
      <label>Loan Amount:</label>
      <span class="field">$&thinsp;{{loan_amount}}</span>
    </div>
    <div class="field-row">
      <label>Interest Rate Cap:</label>
      <span class="field">{{interest_rate_cap}}%</span>
      <label>Financing Contingency Days:</label>
      <span class="field">{{financing_contingency_days}}</span>
    </div>
  </div>
  <div class="field-row">
    <label>Down Payment:</label>
    <span class="field">$&thinsp;{{down_payment}}</span>
  </div>
  <div class="field-row">
    <label>Closing Cost Contributions (Seller):</label>
    <span class="field">$&thinsp;{{seller_closing_cost_contribution}}</span>
  </div>
</section>

<section class="form-section" data-section="contingencies">
  <h2>4. Contingencies</h2>
  <div class="field-row">
    <label>Inspection Contingency:</label>
    <span class="field">{{has_inspection}}</span>
  </div>
  <div class="conditional-block" data-condition="has_inspection == true">
    <div class="field-row">
      <label>Inspection Period (days):</label>
      <span class="field">{{inspection_period_days}}</span>
    </div>
    <div class="field-row">
      <label>Inspector Name:</label>
      <span class="field">{{inspector_name}}</span>
      <label>Inspector License #:</label>
      <span class="field">{{inspector_license}}</span>
    </div>
  </div>
  <div class="field-row">
    <label>Appraisal Contingency:</label>
    <span class="field">{{has_appraisal_contingency}}</span>
  </div>
  <div class="field-row">
    <label>HOA Property:</label>
    <span class="field">{{has_hoa}}</span>
  </div>
  <div class="conditional-block" data-condition="has_hoa == true">
    <div class="field-row">
      <label>HOA Name:</label>
      <span class="field">{{hoa_name}}</span>
    </div>
    <div class="field-row">
      <label>Monthly Dues:</label>
      <span class="field">$&thinsp;{{hoa_monthly_dues}}</span>
      <label>Special Assessments:</label>
      <span class="field">$&thinsp;{{hoa_special_assessments}}</span>
    </div>
    <div class="field-row">
      <label>HOA Document Review Period (days):</label>
      <span class="field">{{hoa_review_period_days}}</span>
    </div>
  </div>
</section>

<section class="form-section" data-section="timeline">
  <h2>5. Timeline</h2>
  <div class="field-row">
    <label>Offer Date:</label>
    <span class="field">{{offer_date}}</span>
  </div>
  <div class="field-row">
    <label>Offer Expiration Date/Time:</label>
    <span class="field">{{offer_expiration}}</span>
  </div>
  <div class="field-row">
    <label>Closing Date:</label>
    <span class="field">{{closing_date}}</span>
  </div>
  <div class="field-row">
    <label>Possession Date:</label>
    <span class="field">{{possession_date}}</span>
  </div>
</section>

<section class="form-section" data-section="additional_terms">
  <h2>6. Additional Terms</h2>
  <div class="field-row">
    <span class="field field-textarea">{{additional_terms}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>7. Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": true,
        "placeholder": "Full legal name(s) of buyer(s)"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": true,
        "placeholder": "Full legal name(s) of seller(s)"
      },
      "buyer_agent_name": {
        "type": "text",
        "label": "Buyer Agent Name",
        "required": false,
        "placeholder": "Buyer''s agent"
      },
      "buyer_brokerage": {
        "type": "text",
        "label": "Buyer Brokerage",
        "required": false,
        "placeholder": "Buyer''s brokerage firm"
      },
      "seller_agent_name": {
        "type": "text",
        "label": "Seller Agent Name",
        "required": false,
        "placeholder": "Seller''s agent"
      },
      "seller_brokerage": {
        "type": "text",
        "label": "Seller Brokerage",
        "required": false,
        "placeholder": "Seller''s brokerage firm"
      },
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Street address of the property"
      },
      "property_city": {
        "type": "text",
        "label": "City",
        "required": true,
        "placeholder": "City"
      },
      "property_county": {
        "type": "text",
        "label": "County",
        "required": true,
        "placeholder": "Oregon county"
      },
      "property_zip": {
        "type": "text",
        "label": "ZIP Code",
        "required": true,
        "placeholder": "97XXX"
      },
      "tax_lot_id": {
        "type": "text",
        "label": "Tax Lot / Parcel ID",
        "required": false,
        "placeholder": "County tax lot number"
      },
      "legal_description": {
        "type": "textarea",
        "label": "Legal Description",
        "required": false,
        "placeholder": "Legal description of the property"
      },
      "purchase_price": {
        "type": "number",
        "label": "Purchase Price",
        "required": true,
        "placeholder": "0.00"
      },
      "earnest_money_amount": {
        "type": "number",
        "label": "Earnest Money Amount",
        "required": true,
        "placeholder": "0.00"
      },
      "earnest_money_holder": {
        "type": "text",
        "label": "Earnest Money Held By",
        "required": false,
        "placeholder": "Escrow company or brokerage"
      },
      "financing_type": {
        "type": "select",
        "label": "Financing Type",
        "required": true,
        "placeholder": "Select financing type",
        "options": ["cash", "conventional", "fha", "va", "usda", "other"]
      },
      "loan_type": {
        "type": "text",
        "label": "Loan Type",
        "required": false,
        "placeholder": "e.g., 30-year fixed"
      },
      "loan_amount": {
        "type": "number",
        "label": "Loan Amount",
        "required": false,
        "placeholder": "0.00"
      },
      "interest_rate_cap": {
        "type": "number",
        "label": "Interest Rate Cap (%)",
        "required": false,
        "placeholder": "0.00"
      },
      "financing_contingency_days": {
        "type": "number",
        "label": "Financing Contingency Days",
        "required": false,
        "placeholder": "21"
      },
      "down_payment": {
        "type": "number",
        "label": "Down Payment",
        "required": false,
        "placeholder": "0.00"
      },
      "seller_closing_cost_contribution": {
        "type": "number",
        "label": "Seller Closing Cost Contribution",
        "required": false,
        "placeholder": "0.00"
      },
      "has_inspection": {
        "type": "boolean",
        "label": "Inspection Contingency",
        "required": false
      },
      "inspection_period_days": {
        "type": "number",
        "label": "Inspection Period (days)",
        "required": false,
        "placeholder": "10"
      },
      "inspector_name": {
        "type": "text",
        "label": "Inspector Name",
        "required": false,
        "placeholder": "Inspector full name"
      },
      "inspector_license": {
        "type": "text",
        "label": "Inspector License #",
        "required": false,
        "placeholder": "OCHI license number"
      },
      "has_appraisal_contingency": {
        "type": "boolean",
        "label": "Appraisal Contingency",
        "required": false
      },
      "has_hoa": {
        "type": "boolean",
        "label": "Property Has HOA",
        "required": false
      },
      "hoa_name": {
        "type": "text",
        "label": "HOA Name",
        "required": false,
        "placeholder": "Homeowners association name"
      },
      "hoa_monthly_dues": {
        "type": "number",
        "label": "HOA Monthly Dues",
        "required": false,
        "placeholder": "0.00"
      },
      "hoa_special_assessments": {
        "type": "number",
        "label": "Special Assessments",
        "required": false,
        "placeholder": "0.00"
      },
      "hoa_review_period_days": {
        "type": "number",
        "label": "HOA Document Review Period (days)",
        "required": false,
        "placeholder": "5"
      },
      "offer_date": {
        "type": "date",
        "label": "Offer Date",
        "required": true
      },
      "offer_expiration": {
        "type": "text",
        "label": "Offer Expiration Date/Time",
        "required": false,
        "placeholder": "MM/DD/YYYY at HH:MM AM/PM"
      },
      "closing_date": {
        "type": "date",
        "label": "Closing Date",
        "required": true,
        "placeholder": "Target closing date"
      },
      "possession_date": {
        "type": "date",
        "label": "Possession Date",
        "required": false,
        "placeholder": "Date buyer takes possession"
      },
      "additional_terms": {
        "type": "textarea",
        "label": "Additional Terms and Conditions",
        "required": false,
        "placeholder": "Any additional terms not covered above"
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": true
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": true
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": true
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": true
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['buyer_name', 'seller_name', 'property_address', 'purchase_price', 'closing_date', 'earnest_money_amount'],

  -- conditional_fields
  '{
    "inspector_info": {
      "visible_when": {"field": "has_inspection", "operator": "eq", "value": true},
      "fields": ["inspection_period_days", "inspector_name", "inspector_license"]
    },
    "hoa_section": {
      "visible_when": {"field": "has_hoa", "operator": "eq", "value": true},
      "fields": ["hoa_name", "hoa_monthly_dues", "hoa_special_assessments", "hoa_review_period_days"]
    },
    "financing_details": {
      "visible_when": {"field": "financing_type", "operator": "neq", "value": "cash"},
      "fields": ["loan_type", "loan_amount", "interest_rate_cap", "financing_contingency_days"]
    }
  }'::jsonb,

  -- clause_library
  '{
    "inspection": {
      "title": "Standard Inspection Clause",
      "text": "Buyer shall have {{inspection_period_days}} business days from mutual acceptance to complete a professional inspection of the property. Buyer may, at Buyer''s sole discretion, approve or disapprove the condition of the property based on the inspection results. If Buyer disapproves, Buyer shall deliver written notice to Seller within the inspection period, and this agreement shall terminate with earnest money returned to Buyer."
    },
    "financing": {
      "title": "Financing Contingency Clause",
      "text": "This agreement is contingent upon Buyer obtaining a commitment for a {{loan_type}} loan in the amount of ${{loan_amount}} at an interest rate not to exceed {{interest_rate_cap}}% within {{financing_contingency_days}} days of mutual acceptance. If Buyer is unable to obtain financing commitment within the specified period, Buyer shall notify Seller in writing and this agreement shall terminate with earnest money returned to Buyer."
    },
    "escalation": {
      "title": "Escalation Clause",
      "text": "In the event of competing offers, Buyer is willing to increase the purchase price by ${{escalation_increment}} above the highest verified competing offer, up to a maximum purchase price of ${{escalation_cap}}. Seller must provide a copy of the competing offer for verification. If this clause is activated, all other terms of this agreement remain unchanged."
    },
    "as_is": {
      "title": "As-Is Clause",
      "text": "Buyer acknowledges and agrees to purchase the property in its present condition (\"as-is\") as of the date of mutual acceptance. Seller makes no warranties or representations regarding the condition of the property beyond the disclosures required by Oregon law (ORS 93.275). Buyer retains the right to conduct inspections and may terminate this agreement during the inspection period if the condition of the property is unacceptable to Buyer."
    },
    "hoa": {
      "title": "HOA Contingency Clause",
      "text": "Seller shall provide Buyer with complete HOA documents including CC&Rs, bylaws, financial statements, meeting minutes from the past 12 months, and any pending or anticipated special assessments within 5 days of mutual acceptance. Buyer shall have {{hoa_review_period_days}} days from receipt of HOA documents to review and approve or disapprove. If Buyer disapproves, this agreement shall terminate with earnest money returned to Buyer."
    },
    "new_construction": {
      "title": "New Construction Clause",
      "text": "Property is being purchased as new construction. Seller/Builder shall complete construction in accordance with the plans and specifications attached as Exhibit A. Closing shall occur within {{new_construction_closing_days}} days of issuance of a Certificate of Occupancy. Buyer shall have the right to conduct a final walk-through inspection within 5 days prior to closing. Seller/Builder warrants all construction work for a period of one year from the date of closing, in accordance with ORS 701.560."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 2. Oregon Seller Property Condition Disclosure (ORS 93.275)
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/seller_disclosure_v1',
  'Oregon Seller Property Condition Disclosure',
  'disclosure',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Seller''s Property Disclosure Statement</h2>
  <p class="statute-ref">Required by Oregon Revised Statutes 93.275</p>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <p class="notice">Seller makes the following disclosures based on Seller''s actual knowledge of the property at the time of this disclosure. This information is not a warranty and is not a substitute for a professional inspection.</p>
</section>

<section class="form-section" data-section="structure">
  <h2>Structure &amp; Roof</h2>
  <div class="field-row">
    <label>Roof Type:</label>
    <span class="field">{{roof_type}}</span>
    <label>Roof Age (years):</label>
    <span class="field">{{roof_age}}</span>
  </div>
  <div class="field-row">
    <label>Roof Condition:</label>
    <span class="field">{{roof_condition}}</span>
  </div>
  <div class="field-row">
    <label>Known leaks or moisture damage:</label>
    <span class="field">{{has_roof_leaks}}</span>
  </div>
  <div class="field-row">
    <label>Foundation Type:</label>
    <span class="field">{{foundation_type}}</span>
  </div>
  <div class="field-row">
    <label>Foundation Issues:</label>
    <span class="field">{{foundation_issues}}</span>
  </div>
  <div class="field-row">
    <label>Exterior Walls Condition:</label>
    <span class="field">{{exterior_walls_condition}}</span>
  </div>
</section>

<section class="form-section" data-section="plumbing">
  <h2>Plumbing</h2>
  <div class="field-row">
    <label>Plumbing Condition:</label>
    <span class="field">{{plumbing_condition}}</span>
  </div>
  <div class="field-row">
    <label>Water Heater Type:</label>
    <span class="field">{{water_heater_type}}</span>
    <label>Age (years):</label>
    <span class="field">{{water_heater_age}}</span>
  </div>
  <div class="field-row">
    <label>Known plumbing issues:</label>
    <span class="field">{{plumbing_issues}}</span>
  </div>
</section>

<section class="form-section" data-section="electrical">
  <h2>Electrical</h2>
  <div class="field-row">
    <label>Electrical Condition:</label>
    <span class="field">{{electrical_condition}}</span>
  </div>
  <div class="field-row">
    <label>Panel Type:</label>
    <span class="field">{{electrical_panel_type}}</span>
    <label>Amperage:</label>
    <span class="field">{{electrical_amperage}}</span>
  </div>
  <div class="field-row">
    <label>Known electrical issues:</label>
    <span class="field">{{electrical_issues}}</span>
  </div>
</section>

<section class="form-section" data-section="heating_cooling">
  <h2>Heating &amp; Cooling</h2>
  <div class="field-row">
    <label>Heating System Type:</label>
    <span class="field">{{heating_type}}</span>
  </div>
  <div class="field-row">
    <label>Heating Condition:</label>
    <span class="field">{{heating_condition}}</span>
  </div>
  <div class="field-row">
    <label>Cooling System Type:</label>
    <span class="field">{{cooling_type}}</span>
  </div>
  <div class="field-row">
    <label>Cooling Condition:</label>
    <span class="field">{{cooling_condition}}</span>
  </div>
  <div class="field-row">
    <label>Fireplace / Wood Stove:</label>
    <span class="field">{{has_fireplace}}</span>
  </div>
</section>

<section class="form-section" data-section="water_sewer">
  <h2>Water &amp; Sewer</h2>
  <div class="field-row">
    <label>Water Source:</label>
    <span class="field">{{water_source}}</span>
  </div>
  <div class="field-row">
    <label>Sewer Type:</label>
    <span class="field">{{sewer_type}}</span>
  </div>
  <div class="field-row">
    <label>Septic Tank Last Pumped:</label>
    <span class="field">{{septic_last_pumped}}</span>
  </div>
  <div class="field-row">
    <label>Known water quality issues:</label>
    <span class="field">{{water_quality_issues}}</span>
  </div>
</section>

<section class="form-section" data-section="environmental">
  <h2>Environmental</h2>
  <div class="field-row">
    <label>Flood Zone:</label>
    <span class="field">{{in_flood_zone}}</span>
  </div>
  <div class="field-row">
    <label>Known environmental hazards:</label>
    <span class="field">{{environmental_hazards}}</span>
  </div>
  <div class="field-row">
    <label>Mold or mildew history:</label>
    <span class="field">{{mold_history}}</span>
  </div>
  <div class="field-row">
    <label>Radon tested:</label>
    <span class="field">{{radon_tested}}</span>
  </div>
  <div class="field-row">
    <label>Asbestos present:</label>
    <span class="field">{{has_asbestos}}</span>
  </div>
</section>

<section class="form-section" data-section="other">
  <h2>Other Disclosures</h2>
  <div class="field-row">
    <label>Boundary or easement disputes:</label>
    <span class="field">{{boundary_disputes}}</span>
  </div>
  <div class="field-row">
    <label>Shared walls, fences, or driveways:</label>
    <span class="field">{{shared_structures}}</span>
  </div>
  <div class="field-row">
    <label>Permits obtained for improvements:</label>
    <span class="field">{{permits_obtained}}</span>
  </div>
  <div class="field-row">
    <label>Additional comments:</label>
    <span class="field field-textarea">{{additional_comments}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Buyer Acknowledgment:</label>
      <span class="field field-signature">{{buyer_acknowledgment_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_acknowledgment_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": true,
        "placeholder": "Full legal name(s) of seller(s)"
      },
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Full property address"
      },
      "roof_type": {
        "type": "select",
        "label": "Roof Type",
        "required": false,
        "options": ["composition shingle", "metal", "tile", "flat/membrane", "cedar shake", "other"]
      },
      "roof_age": {
        "type": "number",
        "label": "Roof Age (years)",
        "required": false,
        "placeholder": "Approximate age"
      },
      "roof_condition": {
        "type": "select",
        "label": "Roof Condition",
        "required": true,
        "options": ["good", "fair", "poor", "unknown"]
      },
      "has_roof_leaks": {
        "type": "boolean",
        "label": "Known Roof Leaks",
        "required": false
      },
      "foundation_type": {
        "type": "select",
        "label": "Foundation Type",
        "required": false,
        "options": ["concrete slab", "crawl space", "basement", "post and pier", "other"]
      },
      "foundation_issues": {
        "type": "textarea",
        "label": "Foundation Issues",
        "required": false,
        "placeholder": "Describe any known foundation problems"
      },
      "exterior_walls_condition": {
        "type": "select",
        "label": "Exterior Walls Condition",
        "required": false,
        "options": ["good", "fair", "poor", "unknown"]
      },
      "plumbing_condition": {
        "type": "select",
        "label": "Plumbing Condition",
        "required": true,
        "options": ["good", "fair", "poor", "unknown"]
      },
      "water_heater_type": {
        "type": "select",
        "label": "Water Heater Type",
        "required": false,
        "options": ["gas", "electric", "tankless", "heat pump", "solar", "other"]
      },
      "water_heater_age": {
        "type": "number",
        "label": "Water Heater Age (years)",
        "required": false,
        "placeholder": "Approximate age"
      },
      "plumbing_issues": {
        "type": "textarea",
        "label": "Known Plumbing Issues",
        "required": false,
        "placeholder": "Describe any known plumbing problems"
      },
      "electrical_condition": {
        "type": "select",
        "label": "Electrical Condition",
        "required": true,
        "options": ["good", "fair", "poor", "unknown"]
      },
      "electrical_panel_type": {
        "type": "select",
        "label": "Electrical Panel Type",
        "required": false,
        "options": ["circuit breaker", "fuse box", "other"]
      },
      "electrical_amperage": {
        "type": "select",
        "label": "Electrical Amperage",
        "required": false,
        "options": ["100 amp", "150 amp", "200 amp", "other", "unknown"]
      },
      "electrical_issues": {
        "type": "textarea",
        "label": "Known Electrical Issues",
        "required": false,
        "placeholder": "Describe any known electrical problems"
      },
      "heating_type": {
        "type": "select",
        "label": "Heating System Type",
        "required": false,
        "options": ["forced air gas", "forced air electric", "heat pump", "baseboard", "radiant", "wood stove", "other"]
      },
      "heating_condition": {
        "type": "select",
        "label": "Heating Condition",
        "required": true,
        "options": ["good", "fair", "poor", "unknown"]
      },
      "cooling_type": {
        "type": "select",
        "label": "Cooling System Type",
        "required": false,
        "options": ["central AC", "heat pump", "window units", "ductless mini-split", "none", "other"]
      },
      "cooling_condition": {
        "type": "select",
        "label": "Cooling Condition",
        "required": false,
        "options": ["good", "fair", "poor", "not applicable", "unknown"]
      },
      "has_fireplace": {
        "type": "boolean",
        "label": "Has Fireplace / Wood Stove",
        "required": false
      },
      "water_source": {
        "type": "select",
        "label": "Water Source",
        "required": true,
        "options": ["public/municipal", "private well", "shared well", "spring", "other"]
      },
      "sewer_type": {
        "type": "select",
        "label": "Sewer Type",
        "required": true,
        "options": ["public sewer", "septic system", "cesspool", "other"]
      },
      "septic_last_pumped": {
        "type": "date",
        "label": "Septic Last Pumped",
        "required": false
      },
      "water_quality_issues": {
        "type": "textarea",
        "label": "Water Quality Issues",
        "required": false,
        "placeholder": "Describe any known water quality problems"
      },
      "in_flood_zone": {
        "type": "boolean",
        "label": "In Flood Zone",
        "required": false
      },
      "environmental_hazards": {
        "type": "textarea",
        "label": "Environmental Hazards",
        "required": false,
        "placeholder": "Describe any known environmental hazards"
      },
      "mold_history": {
        "type": "boolean",
        "label": "History of Mold/Mildew",
        "required": false
      },
      "radon_tested": {
        "type": "boolean",
        "label": "Radon Tested",
        "required": false
      },
      "has_asbestos": {
        "type": "boolean",
        "label": "Known Asbestos",
        "required": false
      },
      "boundary_disputes": {
        "type": "textarea",
        "label": "Boundary / Easement Disputes",
        "required": false,
        "placeholder": "Describe any known boundary or easement issues"
      },
      "shared_structures": {
        "type": "textarea",
        "label": "Shared Walls, Fences, Driveways",
        "required": false,
        "placeholder": "Describe any shared structures"
      },
      "permits_obtained": {
        "type": "textarea",
        "label": "Permits for Improvements",
        "required": false,
        "placeholder": "List permits obtained for any improvements"
      },
      "additional_comments": {
        "type": "textarea",
        "label": "Additional Comments",
        "required": false,
        "placeholder": "Any additional disclosures"
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": true
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": true
      },
      "buyer_acknowledgment_signature": {
        "type": "text",
        "label": "Buyer Acknowledgment Signature",
        "required": false
      },
      "buyer_acknowledgment_date": {
        "type": "date",
        "label": "Buyer Acknowledgment Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['seller_name', 'property_address', 'roof_condition', 'plumbing_condition', 'electrical_condition', 'heating_condition', 'water_source', 'sewer_type'],

  -- conditional_fields
  '{
    "septic_details": {
      "visible_when": {"field": "sewer_type", "operator": "eq", "value": "septic system"},
      "fields": ["septic_last_pumped"]
    }
  }'::jsonb,

  -- clause_library
  '{
    "disclosure_disclaimer": {
      "title": "Standard Disclosure Disclaimer",
      "text": "The information contained in this disclosure statement is based on the Seller''s actual knowledge of the property as of the date signed. This disclosure is not a warranty of any kind by the Seller or any agent representing any party in this transaction and is not a substitute for any inspections or warranties the Buyer may wish to obtain. Seller''s disclosures are made in compliance with ORS 93.275."
    },
    "as_is_notice": {
      "title": "As-Is Notice",
      "text": "Buyer acknowledges that the property is being sold in its present condition. Seller has disclosed all known material defects as required by Oregon law."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 3. Oregon Lead-Based Paint Disclosure (ORS 93.705)
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/lead_paint_disclosure_v1',
  'Oregon Lead-Based Paint Disclosure',
  'disclosure',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Disclosure of Information on Lead-Based Paint and/or Lead-Based Paint Hazards</h2>
  <p class="statute-ref">Federal Law (42 U.S.C. 4852d) &amp; Oregon Revised Statutes 93.705</p>
  <p class="notice">Applicable to residential properties built before 1978.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>Year Built:</label>
    <span class="field">{{property_built_year}}</span>
  </div>
</section>

<section class="form-section" data-section="seller_disclosure">
  <h2>Seller''s Disclosure</h2>
  <div class="field-row">
    <label>Seller Name(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
  <div class="checklist-group">
    <div class="field-row">
      <label>Known lead-based paint present:</label>
      <span class="field">{{has_known_lead_paint}}</span>
    </div>
    <div class="conditional-block" data-condition="has_known_lead_paint == true">
      <div class="field-row">
        <label>Details of known lead-based paint:</label>
        <span class="field field-textarea">{{known_lead_paint_details}}</span>
      </div>
    </div>
    <div class="field-row">
      <label>Lead-based paint hazard reports available:</label>
      <span class="field">{{has_lead_reports}}</span>
    </div>
    <div class="conditional-block" data-condition="has_lead_reports == true">
      <div class="field-row">
        <label>Report details:</label>
        <span class="field field-textarea">{{lead_report_details}}</span>
      </div>
    </div>
  </div>
</section>

<section class="form-section" data-section="buyer_acknowledgment">
  <h2>Buyer''s Acknowledgment</h2>
  <div class="field-row">
    <label>Buyer Name(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="checklist-group">
    <div class="field-row">
      <label>Buyer has received the EPA pamphlet "Protect Your Family From Lead in Your Home":</label>
      <span class="field">{{received_epa_pamphlet}}</span>
    </div>
    <div class="field-row">
      <label>Buyer has received all Seller disclosures above:</label>
      <span class="field">{{received_seller_disclosures}}</span>
    </div>
    <div class="field-row">
      <label>Buyer has received a 10-day opportunity to conduct a lead-based paint inspection:</label>
      <span class="field">{{received_inspection_opportunity}}</span>
    </div>
    <div class="field-row">
      <label>Buyer elects to conduct lead inspection:</label>
      <span class="field">{{buyer_elects_inspection}}</span>
    </div>
    <div class="field-row">
      <label>Buyer waives lead inspection opportunity:</label>
      <span class="field">{{buyer_waives_inspection}}</span>
    </div>
  </div>
</section>

<section class="form-section" data-section="agent_acknowledgment">
  <h2>Agent Acknowledgment</h2>
  <div class="field-row">
    <label>Agent Name:</label>
    <span class="field">{{agent_name}}</span>
  </div>
  <p class="notice">Agent has informed the Seller of the Seller''s obligations under 42 U.S.C. 4852d and is aware of the Agent''s responsibility to ensure compliance.</p>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Agent Signature:</label>
      <span class="field field-signature">{{agent_signature}}</span>
      <label>Date:</label>
      <span class="field">{{agent_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Full property address"
      },
      "property_built_year": {
        "type": "number",
        "label": "Year Built",
        "required": true,
        "placeholder": "e.g. 1965"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": true,
        "placeholder": "Full legal name(s)"
      },
      "has_known_lead_paint": {
        "type": "boolean",
        "label": "Known Lead-Based Paint Present",
        "required": false
      },
      "known_lead_paint_details": {
        "type": "textarea",
        "label": "Lead Paint Details",
        "required": false,
        "placeholder": "Describe location and condition of known lead-based paint"
      },
      "has_lead_reports": {
        "type": "boolean",
        "label": "Lead Reports Available",
        "required": false
      },
      "lead_report_details": {
        "type": "textarea",
        "label": "Lead Report Details",
        "required": false,
        "placeholder": "List available lead hazard reports"
      },
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": true,
        "placeholder": "Full legal name(s)"
      },
      "received_epa_pamphlet": {
        "type": "boolean",
        "label": "Received EPA Pamphlet",
        "required": false
      },
      "received_seller_disclosures": {
        "type": "boolean",
        "label": "Received Seller Disclosures",
        "required": false
      },
      "received_inspection_opportunity": {
        "type": "boolean",
        "label": "Received Inspection Opportunity",
        "required": false
      },
      "buyer_elects_inspection": {
        "type": "boolean",
        "label": "Buyer Elects Lead Inspection",
        "required": false
      },
      "buyer_waives_inspection": {
        "type": "boolean",
        "label": "Buyer Waives Lead Inspection",
        "required": false
      },
      "agent_name": {
        "type": "text",
        "label": "Agent Name",
        "required": false,
        "placeholder": "Agent full name"
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": true
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": true
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": true
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": true
      },
      "agent_signature": {
        "type": "text",
        "label": "Agent Signature",
        "required": false
      },
      "agent_signature_date": {
        "type": "date",
        "label": "Agent Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['property_address', 'property_built_year', 'seller_name', 'buyer_name', 'seller_signature_date', 'buyer_signature_date'],

  -- conditional_fields
  '{
    "known_lead_paint_details": {
      "visible_when": {"field": "has_known_lead_paint", "operator": "eq", "value": true},
      "fields": ["known_lead_paint_details"]
    },
    "lead_report_details": {
      "visible_when": {"field": "has_lead_reports", "operator": "eq", "value": true},
      "fields": ["lead_report_details"]
    }
  }'::jsonb,

  -- clause_library
  '{
    "lead_paint_warning": {
      "title": "Lead Paint Warning",
      "text": "Every purchaser of any interest in residential real property on which a residential dwelling was built prior to 1978 is notified that such property may present exposure to lead from lead-based paint that may place young children at risk of developing lead poisoning. Lead poisoning in young children may produce permanent neurological damage, including learning disabilities, reduced intelligence quotient, behavioral problems, and impaired memory. Lead poisoning also poses a particular risk to pregnant women. The seller of any interest in residential real property is required to provide the buyer with any information on lead-based paint hazards from risk assessments or inspections in the seller''s possession and notify the buyer of any known lead-based paint hazards."
    },
    "oregon_supplement": {
      "title": "Oregon Supplemental Notice (ORS 93.705)",
      "text": "Under Oregon law, sellers of residential real property built before 1978 must comply with both federal lead-based paint disclosure requirements and Oregon''s supplemental disclosure requirements under ORS 93.705. Failure to provide the required disclosures may result in liability to the seller."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 4. Oregon Agency Disclosure (ORS 696.600)
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/agency_disclosure_v1',
  'Oregon Initial Agency Disclosure',
  'disclosure',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Initial Agency Disclosure Pamphlet</h2>
  <p class="statute-ref">Required by Oregon Revised Statutes 696.600 et seq.</p>
  <p class="notice">Oregon law requires a real estate licensee to disclose to all parties in a real estate transaction the relationships the licensee has with each party.</p>
</section>

<section class="form-section" data-section="agent_info">
  <h2>Licensee Information</h2>
  <div class="field-row">
    <label>Agent Name:</label>
    <span class="field">{{agent_name}}</span>
  </div>
  <div class="field-row">
    <label>License Number:</label>
    <span class="field">{{agent_license_number}}</span>
  </div>
  <div class="field-row">
    <label>Brokerage Name:</label>
    <span class="field">{{brokerage_name}}</span>
  </div>
  <div class="field-row">
    <label>Brokerage Address:</label>
    <span class="field">{{brokerage_address}}</span>
  </div>
  <div class="field-row">
    <label>Brokerage Phone:</label>
    <span class="field">{{brokerage_phone}}</span>
  </div>
</section>

<section class="form-section" data-section="agency_type">
  <h2>Agency Relationship</h2>
  <div class="field-row">
    <label>Client Name:</label>
    <span class="field">{{client_name}}</span>
  </div>
  <div class="field-row">
    <label>Agency Type:</label>
    <span class="field">{{agency_type}}</span>
  </div>

  <div class="info-block">
    <h3>Types of Agency Relationships in Oregon:</h3>
    <ul>
      <li><strong>Seller''s Agent:</strong> The agent represents the seller exclusively and owes fiduciary duties to the seller.</li>
      <li><strong>Buyer''s Agent:</strong> The agent represents the buyer exclusively and owes fiduciary duties to the buyer.</li>
      <li><strong>Disclosed Limited Agent:</strong> The agent (or agents within the same brokerage) represents both buyer and seller in the same transaction with the informed consent of both parties.</li>
    </ul>
  </div>
</section>

<section class="form-section" data-section="duties">
  <h2>Agent Duties</h2>
  <div class="info-block">
    <p>A seller''s or buyer''s agent owes the following duties:</p>
    <ul>
      <li>Deal honestly and in good faith</li>
      <li>Present all written offers and counteroffers in a timely manner</li>
      <li>Disclose material facts known by the agent</li>
      <li>Account for all money and property received</li>
      <li>Exercise reasonable care and diligence</li>
    </ul>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Acknowledgment</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Client Signature:</label>
      <span class="field field-signature">{{client_signature}}</span>
      <label>Date:</label>
      <span class="field">{{client_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Agent Signature:</label>
      <span class="field field-signature">{{agent_signature}}</span>
      <label>Date:</label>
      <span class="field">{{agent_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "agent_name": {
        "type": "text",
        "label": "Agent Name",
        "required": true,
        "placeholder": "Licensed agent full name"
      },
      "agent_license_number": {
        "type": "text",
        "label": "Agent License Number",
        "required": false,
        "placeholder": "Oregon RE license number"
      },
      "brokerage_name": {
        "type": "text",
        "label": "Brokerage Name",
        "required": true,
        "placeholder": "Brokerage firm name"
      },
      "brokerage_address": {
        "type": "text",
        "label": "Brokerage Address",
        "required": false,
        "placeholder": "Brokerage office address"
      },
      "brokerage_phone": {
        "type": "text",
        "label": "Brokerage Phone",
        "required": false,
        "placeholder": "(503) 555-0000"
      },
      "client_name": {
        "type": "text",
        "label": "Client Name",
        "required": true,
        "placeholder": "Full name of the client"
      },
      "agency_type": {
        "type": "select",
        "label": "Agency Type",
        "required": true,
        "options": ["seller_agent", "buyer_agent", "disclosed_limited_agent"]
      },
      "client_signature": {
        "type": "text",
        "label": "Client Signature",
        "required": false
      },
      "client_signature_date": {
        "type": "date",
        "label": "Client Signature Date",
        "required": false
      },
      "agent_signature": {
        "type": "text",
        "label": "Agent Signature",
        "required": false
      },
      "agent_signature_date": {
        "type": "date",
        "label": "Agent Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['agent_name', 'brokerage_name', 'client_name', 'agency_type'],

  -- conditional_fields
  '{}'::jsonb,

  -- clause_library
  '{
    "disclosed_limited_agency": {
      "title": "Disclosed Limited Agency Consent",
      "text": "Both the buyer and seller consent to disclosed limited agency. The licensee shall not, without the express written permission of the respective party, disclose: (a) that the buyer will pay more than the offered purchase price; (b) that the seller will accept less than the listing price; (c) the motivating factors for buying or selling; (d) any material information about the other party unless disclosure is required by law or failure to disclose would constitute fraudulent misrepresentation. This consent is made in accordance with ORS 696.800 et seq."
    },
    "buyer_agent_duties": {
      "title": "Buyer Agent Duties",
      "text": "As your buyer''s agent, the licensee owes you the following duties: loyalty, obedience, disclosure, confidentiality, reasonable care and diligence, and full accounting. The licensee will act in your best interest in locating a property, negotiating terms, and facilitating the transaction."
    },
    "seller_agent_duties": {
      "title": "Seller Agent Duties",
      "text": "As your seller''s agent, the licensee owes you the following duties: loyalty, obedience, disclosure, confidentiality, reasonable care and diligence, and full accounting. The licensee will act in your best interest in marketing the property, negotiating terms, and facilitating the transaction."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 5. Oregon Buyer Information Sheet
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/buyer_info_v1',
  'Oregon Buyer Information Sheet',
  'disclosure',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="buyer_info">
  <h2>Buyer Information</h2>
  <div class="field-row">
    <label>Buyer Name(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Phone:</label>
    <span class="field">{{buyer_phone}}</span>
    <label>Email:</label>
    <span class="field">{{buyer_email}}</span>
  </div>
  <div class="field-row">
    <label>Current Address:</label>
    <span class="field">{{buyer_current_address}}</span>
  </div>
</section>

<section class="form-section" data-section="property_preferences">
  <h2>Property Being Considered</h2>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>MLS Number:</label>
    <span class="field">{{mls_number}}</span>
  </div>
</section>

<section class="form-section" data-section="financing">
  <h2>Financing Information</h2>
  <div class="field-row">
    <label>Financing Type:</label>
    <span class="field">{{financing_type}}</span>
  </div>
  <div class="field-row">
    <label>Pre-Approval Status:</label>
    <span class="field">{{pre_approval_status}}</span>
  </div>
  <div class="field-row">
    <label>Lender Name:</label>
    <span class="field">{{lender_name}}</span>
  </div>
  <div class="field-row">
    <label>Lender Contact:</label>
    <span class="field">{{lender_contact}}</span>
  </div>
  <div class="field-row">
    <label>Pre-Approved Amount:</label>
    <span class="field">$&thinsp;{{pre_approved_amount}}</span>
  </div>
  <div class="field-row">
    <label>Down Payment Available:</label>
    <span class="field">$&thinsp;{{down_payment_available}}</span>
  </div>
</section>

<section class="form-section" data-section="timeline">
  <h2>Timeline &amp; Preferences</h2>
  <div class="field-row">
    <label>Desired Move-In Date:</label>
    <span class="field">{{desired_move_in_date}}</span>
  </div>
  <div class="field-row">
    <label>Must sell current home first:</label>
    <span class="field">{{must_sell_first}}</span>
  </div>
  <div class="field-row">
    <label>Additional Notes:</label>
    <span class="field field-textarea">{{buyer_notes}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Acknowledgment</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": true,
        "placeholder": "Full legal name(s)"
      },
      "buyer_phone": {
        "type": "text",
        "label": "Phone Number",
        "required": false,
        "placeholder": "(503) 555-0000"
      },
      "buyer_email": {
        "type": "text",
        "label": "Email Address",
        "required": false,
        "placeholder": "buyer@example.com"
      },
      "buyer_current_address": {
        "type": "text",
        "label": "Current Address",
        "required": false,
        "placeholder": "Current mailing address"
      },
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Address of property being considered"
      },
      "mls_number": {
        "type": "text",
        "label": "MLS Number",
        "required": false,
        "placeholder": "MLS listing number"
      },
      "financing_type": {
        "type": "select",
        "label": "Financing Type",
        "required": true,
        "options": ["cash", "conventional", "fha", "va", "usda", "other"]
      },
      "pre_approval_status": {
        "type": "select",
        "label": "Pre-Approval Status",
        "required": true,
        "options": ["pre_approved", "pre_qualified", "not_yet_applied", "not_applicable"]
      },
      "lender_name": {
        "type": "text",
        "label": "Lender Name",
        "required": false,
        "placeholder": "Lending institution"
      },
      "lender_contact": {
        "type": "text",
        "label": "Lender Contact",
        "required": false,
        "placeholder": "Loan officer name and phone"
      },
      "pre_approved_amount": {
        "type": "number",
        "label": "Pre-Approved Amount",
        "required": false,
        "placeholder": "0.00"
      },
      "down_payment_available": {
        "type": "number",
        "label": "Down Payment Available",
        "required": false,
        "placeholder": "0.00"
      },
      "desired_move_in_date": {
        "type": "date",
        "label": "Desired Move-In Date",
        "required": false
      },
      "must_sell_first": {
        "type": "boolean",
        "label": "Must Sell Current Home First",
        "required": false
      },
      "buyer_notes": {
        "type": "textarea",
        "label": "Additional Notes",
        "required": false,
        "placeholder": "Any additional information"
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": false
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['buyer_name', 'property_address', 'financing_type', 'pre_approval_status'],

  -- conditional_fields
  '{
    "lender_details": {
      "visible_when": {"field": "financing_type", "operator": "neq", "value": "cash"},
      "fields": ["lender_name", "lender_contact", "pre_approved_amount"]
    }
  }'::jsonb,

  -- clause_library
  '{}'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 6. Oregon HOA Disclosure Addendum
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/hoa_addendum_v1',
  'Oregon HOA / Homeowners Association Disclosure Addendum',
  'addendum',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>HOA / Homeowners Association Disclosure Addendum</h2>
  <p class="notice">This addendum is attached to and made part of the Oregon Residential Purchase Agreement for the property listed below.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>Buyer(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
</section>

<section class="form-section" data-section="hoa_details">
  <h2>HOA Information</h2>
  <div class="field-row">
    <label>HOA Name:</label>
    <span class="field">{{hoa_name}}</span>
  </div>
  <div class="field-row">
    <label>Management Company:</label>
    <span class="field">{{management_company}}</span>
  </div>
  <div class="field-row">
    <label>Management Contact:</label>
    <span class="field">{{management_contact}}</span>
  </div>
  <div class="field-row">
    <label>Monthly Dues:</label>
    <span class="field">$&thinsp;{{monthly_dues}}</span>
  </div>
  <div class="field-row">
    <label>Special Assessments (current or pending):</label>
    <span class="field">$&thinsp;{{special_assessments}}</span>
  </div>
  <div class="field-row">
    <label>Special Assessment Details:</label>
    <span class="field field-textarea">{{special_assessment_details}}</span>
  </div>
  <div class="field-row">
    <label>Initiation / Transfer Fee:</label>
    <span class="field">$&thinsp;{{transfer_fee}}</span>
  </div>
  <div class="field-row">
    <label>Transfer Fee Paid By:</label>
    <span class="field">{{transfer_fee_paid_by}}</span>
  </div>
</section>

<section class="form-section" data-section="hoa_documents">
  <h2>HOA Documents</h2>
  <div class="checklist-group">
    <div class="field-row">
      <label>CC&amp;Rs provided:</label>
      <span class="field">{{ccrs_provided}}</span>
    </div>
    <div class="field-row">
      <label>Bylaws provided:</label>
      <span class="field">{{bylaws_provided}}</span>
    </div>
    <div class="field-row">
      <label>Financial statements provided:</label>
      <span class="field">{{financials_provided}}</span>
    </div>
    <div class="field-row">
      <label>Meeting minutes (past 12 months) provided:</label>
      <span class="field">{{minutes_provided}}</span>
    </div>
    <div class="field-row">
      <label>Reserve study provided:</label>
      <span class="field">{{reserve_study_provided}}</span>
    </div>
  </div>
  <div class="field-row">
    <label>HOA Document Review Period (days):</label>
    <span class="field">{{hoa_review_period_days}}</span>
  </div>
</section>

<section class="form-section" data-section="pending_litigation">
  <h2>Pending Actions</h2>
  <div class="field-row">
    <label>Pending litigation against HOA:</label>
    <span class="field">{{has_pending_litigation}}</span>
  </div>
  <div class="conditional-block" data-condition="has_pending_litigation == true">
    <div class="field-row">
      <label>Litigation Details:</label>
      <span class="field field-textarea">{{litigation_details}}</span>
    </div>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Full property address"
      },
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "hoa_name": {
        "type": "text",
        "label": "HOA Name",
        "required": true,
        "placeholder": "Homeowners association name"
      },
      "management_company": {
        "type": "text",
        "label": "Management Company",
        "required": false,
        "placeholder": "HOA management company"
      },
      "management_contact": {
        "type": "text",
        "label": "Management Contact",
        "required": false,
        "placeholder": "Phone or email"
      },
      "monthly_dues": {
        "type": "number",
        "label": "Monthly Dues",
        "required": true,
        "placeholder": "0.00"
      },
      "special_assessments": {
        "type": "number",
        "label": "Special Assessments",
        "required": true,
        "placeholder": "0.00"
      },
      "special_assessment_details": {
        "type": "textarea",
        "label": "Special Assessment Details",
        "required": false,
        "placeholder": "Describe current or pending special assessments"
      },
      "transfer_fee": {
        "type": "number",
        "label": "Transfer / Initiation Fee",
        "required": false,
        "placeholder": "0.00"
      },
      "transfer_fee_paid_by": {
        "type": "select",
        "label": "Transfer Fee Paid By",
        "required": false,
        "options": ["buyer", "seller", "split"]
      },
      "ccrs_provided": {
        "type": "boolean",
        "label": "CC&Rs Provided",
        "required": false
      },
      "bylaws_provided": {
        "type": "boolean",
        "label": "Bylaws Provided",
        "required": false
      },
      "financials_provided": {
        "type": "boolean",
        "label": "Financial Statements Provided",
        "required": false
      },
      "minutes_provided": {
        "type": "boolean",
        "label": "Meeting Minutes Provided",
        "required": false
      },
      "reserve_study_provided": {
        "type": "boolean",
        "label": "Reserve Study Provided",
        "required": false
      },
      "hoa_review_period_days": {
        "type": "number",
        "label": "HOA Document Review Period (days)",
        "required": false,
        "placeholder": "5"
      },
      "has_pending_litigation": {
        "type": "boolean",
        "label": "Pending Litigation Against HOA",
        "required": false
      },
      "litigation_details": {
        "type": "textarea",
        "label": "Litigation Details",
        "required": false,
        "placeholder": "Describe pending litigation"
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": false
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": false
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": false
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['hoa_name', 'monthly_dues', 'special_assessments'],

  -- conditional_fields
  '{
    "litigation_section": {
      "visible_when": {"field": "has_pending_litigation", "operator": "eq", "value": true},
      "fields": ["litigation_details"]
    },
    "special_assessment_info": {
      "visible_when": {"field": "special_assessments", "operator": "gt", "value": 0},
      "fields": ["special_assessment_details"]
    }
  }'::jsonb,

  -- clause_library
  '{
    "hoa_review_contingency": {
      "title": "HOA Document Review Contingency",
      "text": "Buyer''s obligation to purchase is contingent upon Buyer''s review and approval of all HOA documents within {{hoa_review_period_days}} days of receipt. If Buyer disapproves of any HOA document, Buyer shall provide written notice to Seller within the review period, and this agreement shall terminate with earnest money returned to Buyer."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 7. Oregon Inspection Addendum
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/inspection_addendum_v1',
  'Oregon Inspection Contingency Addendum',
  'addendum',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Inspection Contingency Addendum</h2>
  <p class="notice">This addendum is attached to and made part of the Oregon Residential Purchase Agreement for the property listed below.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>Buyer(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
</section>

<section class="form-section" data-section="inspection_terms">
  <h2>Inspection Terms</h2>
  <div class="field-row">
    <label>Inspection Period (business days from mutual acceptance):</label>
    <span class="field">{{inspection_period_days}}</span>
  </div>
  <div class="field-row">
    <label>Inspection Types Permitted:</label>
    <span class="field">{{inspection_types}}</span>
  </div>
  <div class="field-row">
    <label>Buyer''s right to approve/disapprove:</label>
    <span class="field">{{buyer_approval_right}}</span>
  </div>
</section>

<section class="form-section" data-section="access">
  <h2>Property Access</h2>
  <div class="field-row">
    <label>Seller grants reasonable access for inspections:</label>
    <span class="field">{{seller_grants_access}}</span>
  </div>
  <div class="field-row">
    <label>Access Instructions:</label>
    <span class="field field-textarea">{{access_instructions}}</span>
  </div>
  <div class="field-row">
    <label>Utilities to be on during inspection:</label>
    <span class="field">{{utilities_on}}</span>
  </div>
</section>

<section class="form-section" data-section="response">
  <h2>Response Options</h2>
  <div class="info-block">
    <p>Following completion of inspections, Buyer may:</p>
    <ul>
      <li>Approve the property condition and proceed with the purchase</li>
      <li>Submit a repair request / post-inspection addendum</li>
      <li>Disapprove the property condition and terminate the agreement with earnest money returned</li>
    </ul>
  </div>
  <div class="field-row">
    <label>Seller response period after repair request (days):</label>
    <span class="field">{{seller_response_days}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": true,
        "placeholder": "Full property address"
      },
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": true,
        "placeholder": "Full legal name(s)"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "inspection_period_days": {
        "type": "number",
        "label": "Inspection Period (business days)",
        "required": true,
        "placeholder": "10"
      },
      "inspection_types": {
        "type": "textarea",
        "label": "Inspection Types Permitted",
        "required": false,
        "placeholder": "General, structural, pest/dry rot, radon, sewer scope, well, septic, etc."
      },
      "buyer_approval_right": {
        "type": "select",
        "label": "Buyer Approval Right",
        "required": false,
        "options": ["sole_discretion", "objective_defects_only"]
      },
      "seller_grants_access": {
        "type": "boolean",
        "label": "Seller Grants Access",
        "required": false
      },
      "access_instructions": {
        "type": "textarea",
        "label": "Access Instructions",
        "required": false,
        "placeholder": "How to arrange access for inspections"
      },
      "utilities_on": {
        "type": "boolean",
        "label": "Utilities On During Inspection",
        "required": false
      },
      "seller_response_days": {
        "type": "number",
        "label": "Seller Response Period (days)",
        "required": false,
        "placeholder": "3"
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": false
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": false
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": false
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['inspection_period_days', 'buyer_name', 'property_address'],

  -- conditional_fields
  '{}'::jsonb,

  -- clause_library
  '{
    "sole_discretion": {
      "title": "Sole Discretion Inspection Clause",
      "text": "Buyer may, in Buyer''s sole and absolute discretion, approve or disapprove the condition of the property based on any inspection results, for any reason or no reason. If Buyer disapproves, Buyer shall deliver written notice to Seller within the inspection period, and this agreement shall terminate with earnest money returned to Buyer."
    },
    "objective_defects": {
      "title": "Objective Defects Inspection Clause",
      "text": "Buyer may disapprove the condition of the property only if the inspection reveals objective material defects that were not previously disclosed by Seller. Cosmetic conditions and items that were visible during Buyer''s initial property viewing do not constitute grounds for disapproval under this clause."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 8. Oregon Financing Addendum
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/financing_addendum_v1',
  'Oregon Financing Contingency Addendum',
  'addendum',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Financing Contingency Addendum</h2>
  <p class="notice">This addendum is attached to and made part of the Oregon Residential Purchase Agreement for the property listed below.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>Buyer(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
</section>

<section class="form-section" data-section="loan_details">
  <h2>Loan Details</h2>
  <div class="field-row">
    <label>Loan Type:</label>
    <span class="field">{{loan_type}}</span>
  </div>
  <div class="field-row">
    <label>Loan Amount:</label>
    <span class="field">$&thinsp;{{loan_amount}}</span>
  </div>
  <div class="field-row">
    <label>Interest Rate Cap:</label>
    <span class="field">{{interest_rate_cap}}%</span>
  </div>
  <div class="field-row">
    <label>Loan Term (years):</label>
    <span class="field">{{loan_term_years}}</span>
  </div>
  <div class="field-row">
    <label>Down Payment:</label>
    <span class="field">$&thinsp;{{down_payment}}</span>
  </div>
</section>

<section class="form-section" data-section="contingency_terms">
  <h2>Contingency Terms</h2>
  <div class="field-row">
    <label>Financing Contingency Period (days from mutual acceptance):</label>
    <span class="field">{{financing_contingency_days}}</span>
  </div>
  <div class="field-row">
    <label>Buyer shall apply for financing within (days):</label>
    <span class="field">{{application_deadline_days}}</span>
  </div>
  <div class="field-row">
    <label>Buyer''s lender:</label>
    <span class="field">{{lender_name}}</span>
  </div>
  <div class="field-row">
    <label>Loan officer:</label>
    <span class="field">{{loan_officer_name}}</span>
  </div>
  <div class="field-row">
    <label>Loan officer phone:</label>
    <span class="field">{{loan_officer_phone}}</span>
  </div>
</section>

<section class="form-section" data-section="failure_terms">
  <h2>If Financing Is Not Obtained</h2>
  <div class="info-block">
    <p>If Buyer is unable to obtain a financing commitment within the contingency period, Buyer shall provide written notice to Seller. Upon receipt of such notice, this agreement shall terminate and earnest money shall be returned to Buyer, less any costs incurred for services already rendered.</p>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": false,
        "placeholder": "Full property address"
      },
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "loan_type": {
        "type": "select",
        "label": "Loan Type",
        "required": true,
        "options": ["conventional", "fha", "va", "usda", "jumbo", "adjustable_rate", "other"]
      },
      "loan_amount": {
        "type": "number",
        "label": "Loan Amount",
        "required": true,
        "placeholder": "0.00"
      },
      "interest_rate_cap": {
        "type": "number",
        "label": "Interest Rate Cap (%)",
        "required": true,
        "placeholder": "0.00"
      },
      "loan_term_years": {
        "type": "select",
        "label": "Loan Term (years)",
        "required": false,
        "options": ["15", "20", "30"]
      },
      "down_payment": {
        "type": "number",
        "label": "Down Payment",
        "required": false,
        "placeholder": "0.00"
      },
      "financing_contingency_days": {
        "type": "number",
        "label": "Financing Contingency Period (days)",
        "required": true,
        "placeholder": "21"
      },
      "application_deadline_days": {
        "type": "number",
        "label": "Application Deadline (days)",
        "required": false,
        "placeholder": "5"
      },
      "lender_name": {
        "type": "text",
        "label": "Lender Name",
        "required": false,
        "placeholder": "Lending institution"
      },
      "loan_officer_name": {
        "type": "text",
        "label": "Loan Officer Name",
        "required": false,
        "placeholder": "Loan officer full name"
      },
      "loan_officer_phone": {
        "type": "text",
        "label": "Loan Officer Phone",
        "required": false,
        "placeholder": "(503) 555-0000"
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": false
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": false
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": false
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['loan_type', 'loan_amount', 'interest_rate_cap', 'financing_contingency_days'],

  -- conditional_fields
  '{}'::jsonb,

  -- clause_library
  '{
    "standard_financing": {
      "title": "Standard Financing Contingency",
      "text": "This agreement is contingent upon Buyer obtaining a written financing commitment for a {{loan_type}} loan in the amount of ${{loan_amount}} at an interest rate not to exceed {{interest_rate_cap}}% within {{financing_contingency_days}} days of mutual acceptance. Buyer shall make a good-faith effort to obtain financing, including submitting a complete loan application within {{application_deadline_days}} days of mutual acceptance."
    },
    "financing_removal": {
      "title": "Financing Contingency Removal",
      "text": "Upon obtaining a financing commitment, Buyer shall promptly notify Seller in writing. Upon delivery of such notice, the financing contingency shall be deemed satisfied and removed."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 9. Oregon Counter Offer
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/counter_offer_v1',
  'Oregon Counter Offer',
  'amendment',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Counter Offer</h2>
  <p class="notice">This counter offer modifies the original offer and, if accepted, becomes part of the Oregon Residential Purchase Agreement.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
</section>

<section class="form-section" data-section="original_offer">
  <h2>Original Offer Reference</h2>
  <div class="field-row">
    <label>Original Offer Date:</label>
    <span class="field">{{original_offer_date}}</span>
  </div>
  <div class="field-row">
    <label>Original Buyer(s):</label>
    <span class="field">{{original_buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Original Seller(s):</label>
    <span class="field">{{original_seller_name}}</span>
  </div>
  <div class="field-row">
    <label>Original Purchase Price:</label>
    <span class="field">$&thinsp;{{original_purchase_price}}</span>
  </div>
</section>

<section class="form-section" data-section="counter_terms">
  <h2>Counter Offer Terms</h2>
  <div class="field-row">
    <label>Counter Offer Made By:</label>
    <span class="field">{{counter_party}}</span>
  </div>
  <div class="field-row">
    <label>Counter Offer Number:</label>
    <span class="field">{{counter_offer_number}}</span>
  </div>
  <div class="field-row">
    <label>Counter Offer Terms:</label>
    <span class="field field-textarea">{{counter_terms}}</span>
  </div>
  <div class="field-row">
    <label>Revised Purchase Price (if changed):</label>
    <span class="field">$&thinsp;{{revised_purchase_price}}</span>
  </div>
  <div class="field-row">
    <label>Revised Closing Date (if changed):</label>
    <span class="field">{{revised_closing_date}}</span>
  </div>
  <div class="field-row">
    <label>Revised Earnest Money (if changed):</label>
    <span class="field">$&thinsp;{{revised_earnest_money}}</span>
  </div>
  <p class="notice">All other terms and conditions of the original offer remain unchanged except as modified by this counter offer.</p>
</section>

<section class="form-section" data-section="expiration">
  <h2>Counter Offer Expiration</h2>
  <div class="field-row">
    <label>This counter offer expires on:</label>
    <span class="field">{{counter_expiration_date}}</span>
    <label>at:</label>
    <span class="field">{{counter_expiration_time}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Counter Offer By (Signature):</label>
      <span class="field field-signature">{{counter_party_signature}}</span>
      <label>Date:</label>
      <span class="field">{{counter_party_signature_date}}</span>
    </div>
  </div>
  <h3>Acceptance</h3>
  <div class="signature-block">
    <div class="field-row">
      <label>Accepted By (Signature):</label>
      <span class="field field-signature">{{acceptance_signature}}</span>
      <label>Date:</label>
      <span class="field">{{acceptance_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": false,
        "placeholder": "Full property address"
      },
      "original_offer_date": {
        "type": "date",
        "label": "Original Offer Date",
        "required": true
      },
      "original_buyer_name": {
        "type": "text",
        "label": "Original Buyer Name(s)",
        "required": false,
        "placeholder": "Buyer name(s) from original offer"
      },
      "original_seller_name": {
        "type": "text",
        "label": "Original Seller Name(s)",
        "required": false,
        "placeholder": "Seller name(s) from original offer"
      },
      "original_purchase_price": {
        "type": "number",
        "label": "Original Purchase Price",
        "required": false,
        "placeholder": "0.00"
      },
      "counter_party": {
        "type": "select",
        "label": "Counter Offer Made By",
        "required": true,
        "options": ["seller", "buyer"]
      },
      "counter_offer_number": {
        "type": "number",
        "label": "Counter Offer Number",
        "required": false,
        "placeholder": "1"
      },
      "counter_terms": {
        "type": "textarea",
        "label": "Counter Offer Terms",
        "required": true,
        "placeholder": "Describe all changes to the original offer"
      },
      "revised_purchase_price": {
        "type": "number",
        "label": "Revised Purchase Price",
        "required": false,
        "placeholder": "0.00"
      },
      "revised_closing_date": {
        "type": "date",
        "label": "Revised Closing Date",
        "required": false
      },
      "revised_earnest_money": {
        "type": "number",
        "label": "Revised Earnest Money",
        "required": false,
        "placeholder": "0.00"
      },
      "counter_expiration_date": {
        "type": "date",
        "label": "Counter Offer Expiration Date",
        "required": false
      },
      "counter_expiration_time": {
        "type": "text",
        "label": "Counter Offer Expiration Time",
        "required": false,
        "placeholder": "5:00 PM"
      },
      "counter_party_signature": {
        "type": "text",
        "label": "Counter Party Signature",
        "required": false
      },
      "counter_party_signature_date": {
        "type": "date",
        "label": "Counter Party Signature Date",
        "required": false
      },
      "acceptance_signature": {
        "type": "text",
        "label": "Acceptance Signature",
        "required": false
      },
      "acceptance_date": {
        "type": "date",
        "label": "Acceptance Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['original_offer_date', 'counter_party', 'counter_terms'],

  -- conditional_fields
  '{}'::jsonb,

  -- clause_library
  '{
    "counter_offer_notice": {
      "title": "Counter Offer Standard Notice",
      "text": "This counter offer, when signed by the counter-offering party, shall constitute a rejection of the original offer (or prior counter offer) and a new offer on the terms set forth herein. If this counter offer is not accepted by the expiration date and time, it shall be deemed withdrawn and have no further force or effect."
    },
    "multiple_counter": {
      "title": "Multiple Counter Offer Notice",
      "text": "Seller is issuing this counter offer to multiple prospective buyers simultaneously. Acceptance of this counter offer by one party does not automatically create a binding agreement. A binding agreement is formed only when Seller signs and delivers a copy of the accepted counter offer to the accepted Buyer."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


-- ============================================================================
-- 10. Oregon Post-Inspection Repairs Addendum
-- ============================================================================
INSERT INTO forms (
  id, tenant_id, form_key, form_name, form_type, jurisdiction,
  effective_date, superseded_date,
  html_template, json_schema, required_fields,
  conditional_fields, clause_library,
  version, is_system_form, created_by,
  created_at, updated_at, deleted_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'or/post_inspection_repairs_v1',
  'Oregon Post-Inspection Repairs Addendum',
  'addendum',
  'OR',
  '2025-01-01',
  NULL,

  -- html_template
  '<section class="form-section" data-section="header">
  <h2>Post-Inspection Repairs Addendum</h2>
  <p class="notice">This addendum is attached to and made part of the Oregon Residential Purchase Agreement for the property listed below. This addendum is submitted following the completion of property inspections.</p>
  <div class="field-row">
    <label>Property Address:</label>
    <span class="field">{{property_address}}</span>
  </div>
  <div class="field-row">
    <label>Buyer(s):</label>
    <span class="field">{{buyer_name}}</span>
  </div>
  <div class="field-row">
    <label>Seller(s):</label>
    <span class="field">{{seller_name}}</span>
  </div>
</section>

<section class="form-section" data-section="inspection_ref">
  <h2>Inspection Reference</h2>
  <div class="field-row">
    <label>Inspection Date:</label>
    <span class="field">{{inspection_date}}</span>
  </div>
  <div class="field-row">
    <label>Inspector Name:</label>
    <span class="field">{{inspector_name}}</span>
  </div>
  <div class="field-row">
    <label>Inspector Company:</label>
    <span class="field">{{inspector_company}}</span>
  </div>
  <div class="field-row">
    <label>Inspection Report Number:</label>
    <span class="field">{{inspection_report_number}}</span>
  </div>
</section>

<section class="form-section" data-section="repair_items">
  <h2>Requested Repairs</h2>
  <p class="notice">Buyer requests that Seller complete the following repairs prior to closing:</p>
  <div class="field-row">
    <label>Repair Items:</label>
    <span class="field field-textarea">{{repair_items}}</span>
  </div>
  <div class="field-row">
    <label>Repair Deadline:</label>
    <span class="field">{{repair_deadline}}</span>
  </div>
  <div class="field-row">
    <label>Repairs to be completed by licensed contractors:</label>
    <span class="field">{{licensed_contractors_required}}</span>
  </div>
  <div class="field-row">
    <label>Receipts / documentation required:</label>
    <span class="field">{{receipts_required}}</span>
  </div>
</section>

<section class="form-section" data-section="credit_option">
  <h2>Alternative: Credit in Lieu of Repairs</h2>
  <div class="field-row">
    <label>Buyer will accept credit in lieu of repairs:</label>
    <span class="field">{{accept_credit_option}}</span>
  </div>
  <div class="conditional-block" data-condition="accept_credit_option == true">
    <div class="field-row">
      <label>Requested Credit Amount:</label>
      <span class="field">$&thinsp;{{credit_amount}}</span>
    </div>
  </div>
</section>

<section class="form-section" data-section="seller_response">
  <h2>Seller Response</h2>
  <div class="field-row">
    <label>Seller''s response:</label>
    <span class="field">{{seller_response}}</span>
  </div>
  <div class="conditional-block" data-condition="seller_response == ''partial''">
    <div class="field-row">
      <label>Seller agrees to the following repairs/credits:</label>
      <span class="field field-textarea">{{seller_agreed_items}}</span>
    </div>
  </div>
  <div class="field-row">
    <label>Buyer''s right to re-inspect after repairs:</label>
    <span class="field">{{buyer_reinspection_right}}</span>
  </div>
</section>

<section class="form-section" data-section="signatures">
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="field-row">
      <label>Buyer Signature:</label>
      <span class="field field-signature">{{buyer_signature}}</span>
      <label>Date:</label>
      <span class="field">{{buyer_signature_date}}</span>
    </div>
    <div class="field-row">
      <label>Seller Signature:</label>
      <span class="field field-signature">{{seller_signature}}</span>
      <label>Date:</label>
      <span class="field">{{seller_signature_date}}</span>
    </div>
  </div>
</section>',

  -- json_schema
  '{
    "fields": {
      "property_address": {
        "type": "text",
        "label": "Property Address",
        "required": false,
        "placeholder": "Full property address"
      },
      "buyer_name": {
        "type": "text",
        "label": "Buyer Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "seller_name": {
        "type": "text",
        "label": "Seller Name(s)",
        "required": false,
        "placeholder": "Full legal name(s)"
      },
      "inspection_date": {
        "type": "date",
        "label": "Inspection Date",
        "required": true
      },
      "inspector_name": {
        "type": "text",
        "label": "Inspector Name",
        "required": false,
        "placeholder": "Inspector full name"
      },
      "inspector_company": {
        "type": "text",
        "label": "Inspector Company",
        "required": false,
        "placeholder": "Inspection company name"
      },
      "inspection_report_number": {
        "type": "text",
        "label": "Inspection Report Number",
        "required": false,
        "placeholder": "Report reference number"
      },
      "repair_items": {
        "type": "textarea",
        "label": "Repair Items",
        "required": true,
        "placeholder": "List each repair item with reference to inspection report section"
      },
      "repair_deadline": {
        "type": "date",
        "label": "Repair Deadline",
        "required": true
      },
      "licensed_contractors_required": {
        "type": "boolean",
        "label": "Licensed Contractors Required",
        "required": false
      },
      "receipts_required": {
        "type": "boolean",
        "label": "Receipts / Documentation Required",
        "required": false
      },
      "accept_credit_option": {
        "type": "boolean",
        "label": "Accept Credit in Lieu of Repairs",
        "required": false
      },
      "credit_amount": {
        "type": "number",
        "label": "Credit Amount",
        "required": false,
        "placeholder": "0.00"
      },
      "seller_response": {
        "type": "select",
        "label": "Seller Response",
        "required": false,
        "options": ["accept_all", "partial", "reject", "counter"]
      },
      "seller_agreed_items": {
        "type": "textarea",
        "label": "Seller Agreed Repairs/Credits",
        "required": false,
        "placeholder": "List items seller agrees to repair or credit"
      },
      "buyer_reinspection_right": {
        "type": "boolean",
        "label": "Buyer Re-Inspection Right",
        "required": false
      },
      "buyer_signature": {
        "type": "text",
        "label": "Buyer Signature",
        "required": false
      },
      "buyer_signature_date": {
        "type": "date",
        "label": "Buyer Signature Date",
        "required": false
      },
      "seller_signature": {
        "type": "text",
        "label": "Seller Signature",
        "required": false
      },
      "seller_signature_date": {
        "type": "date",
        "label": "Seller Signature Date",
        "required": false
      }
    }
  }'::jsonb,

  -- required_fields
  ARRAY['inspection_date', 'repair_items', 'repair_deadline'],

  -- conditional_fields
  '{
    "credit_details": {
      "visible_when": {"field": "accept_credit_option", "operator": "eq", "value": true},
      "fields": ["credit_amount"]
    },
    "partial_response_details": {
      "visible_when": {"field": "seller_response", "operator": "eq", "value": "partial"},
      "fields": ["seller_agreed_items"]
    }
  }'::jsonb,

  -- clause_library
  '{
    "repair_standards": {
      "title": "Repair Standards Clause",
      "text": "All repairs shall be completed in a workmanlike manner by appropriately licensed and insured contractors (where applicable under Oregon law). Seller shall provide Buyer with copies of all receipts, invoices, and any applicable permits or warranties for completed repairs no later than 3 days prior to closing."
    },
    "reinspection_right": {
      "title": "Re-Inspection Clause",
      "text": "Buyer shall have the right to conduct a re-inspection of all completed repairs within 5 days prior to closing to verify that repairs have been completed in accordance with this addendum. If repairs are not completed satisfactorily, Buyer may: (a) accept the property as-is; (b) negotiate additional repairs or credits; or (c) terminate this agreement with earnest money returned to Buyer."
    },
    "credit_in_lieu": {
      "title": "Credit in Lieu of Repairs Clause",
      "text": "In lieu of completing the repairs listed herein, Seller shall provide Buyer with a credit of ${{credit_amount}} at closing toward Buyer''s closing costs or as a reduction in purchase price. Buyer accepts this credit as full satisfaction of the repair requests in this addendum and waives any further claims related to the inspection items covered herein."
    }
  }'::jsonb,

  1,     -- version
  true,  -- is_system_form
  NULL,  -- created_by
  NOW(),
  NOW(),
  NULL   -- deleted_at
);


COMMIT;
