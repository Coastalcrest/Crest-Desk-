-- Migration: 0071_create_email_rules.sql
-- Phase 9: Email Hub and AI Assistant

CREATE TABLE IF NOT EXISTS email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID,
  name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_rules_tenant ON email_rules (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_rules_agent ON email_rules (agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_rules_rule_type ON email_rules (rule_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_rules_is_active ON email_rules (is_active) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE email_rules ENABLE ROW LEVEL SECURITY;
