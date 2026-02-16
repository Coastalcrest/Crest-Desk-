-- Migration: 0045_create_lead_sources
-- Phase 5: CRM & Follow-Up

CREATE TABLE lead_sources (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  source_name               varchar(255) NOT NULL,
  source_type               varchar(100) NOT NULL,
  is_active                 boolean NOT NULL DEFAULT true,
  auto_response_sequence_id uuid REFERENCES follow_up_sequences(id) ON DELETE RESTRICT,
  lead_distribution_rule    varchar(50) NOT NULL DEFAULT 'round_robin',
  lead_distribution_config  jsonb NOT NULL DEFAULT '{}',
  total_leads               integer NOT NULL DEFAULT 0,
  converted_leads           integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lead_sources_tenant ON lead_sources(tenant_id);
CREATE INDEX idx_lead_sources_type ON lead_sources(source_type);
