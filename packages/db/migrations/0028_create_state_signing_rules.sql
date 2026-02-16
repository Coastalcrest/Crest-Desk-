-- Migration: 0028_create_state_signing_rules
-- Phase 3: E-Signatures & Closing

CREATE TABLE state_signing_rules (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction            varchar(2) NOT NULL,
  rule_category           varchar(100) NOT NULL,
  document_type           varchar(100) NOT NULL,
  requires_witness        boolean DEFAULT false,
  witness_count           integer DEFAULT 0,
  requires_notary         boolean DEFAULT false,
  remote_notary_allowed   boolean DEFAULT false,
  requires_wet_signature  boolean DEFAULT false,
  e_signature_allowed     boolean DEFAULT true,
  signer_consent_required boolean DEFAULT true,
  record_retention_years  integer DEFAULT 5,
  details                 jsonb DEFAULT '{}',
  effective_date          date NOT NULL,
  superseded_date         date,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_state_signing_rules_jurisdiction ON state_signing_rules(jurisdiction, document_type);
