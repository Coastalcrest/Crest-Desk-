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

-- Seed data: default pipeline stages
-- Note: Uses a placeholder tenant_id. In production, these would be inserted per-tenant during onboarding.
INSERT INTO pipeline_stages (tenant_id, stage_name, stage_order, stage_color, is_default, is_closed_won, is_closed_lost) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Lead',           1, '#EF4444', true,  false, false),
  ('00000000-0000-0000-0000-000000000000', 'Nurture',        2, '#F59E0B', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'Active',         3, '#3B82F6', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'Under Contract', 4, '#8B5CF6', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'Pending',        5, '#EC4899', false, false, false),
  ('00000000-0000-0000-0000-000000000000', 'Closed Won',     6, '#10B981', false, true,  false),
  ('00000000-0000-0000-0000-000000000000', 'Closed Lost',    7, '#6B7280', false, false, true);
