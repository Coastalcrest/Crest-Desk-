-- Migration: 0040_create_pipeline_stages
-- Phase 5: CRM & Follow-Up

CREATE TABLE pipeline_stages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  stage_name     varchar(100) NOT NULL,
  stage_order    integer NOT NULL,
  stage_color    varchar(7) NOT NULL DEFAULT '#6B7280',
  is_default     boolean NOT NULL DEFAULT false,
  is_closed_won  boolean NOT NULL DEFAULT false,
  is_closed_lost boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pipeline_stages_tenant ON pipeline_stages(tenant_id);
CREATE UNIQUE INDEX idx_pipeline_stages_tenant_order ON pipeline_stages(tenant_id, stage_order);

-- Default pipeline stages are inserted per-tenant via demo-data.sql seed.
