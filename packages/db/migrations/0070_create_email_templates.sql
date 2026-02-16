-- Migration: 0070_create_email_templates.sql
-- Phase 9: Email Hub and AI Assistant

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  agent_id UUID,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  tone VARCHAR(30) DEFAULT 'professional',
  is_global BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_templates_tenant ON email_templates (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_templates_category ON email_templates (category) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_templates_is_global ON email_templates (is_global) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
