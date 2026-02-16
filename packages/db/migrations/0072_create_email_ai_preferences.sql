-- Migration: 0072_create_email_ai_preferences.sql
-- Phase 9: Email Hub and AI Assistant

CREATE TABLE IF NOT EXISTS email_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  writing_style JSONB,
  tone_preferences JSONB,
  signature_html TEXT,
  signature_text TEXT,
  default_tone VARCHAR(30) DEFAULT 'professional',
  auto_suggest JSONB,
  learned_patterns JSONB,
  preferred_greetings JSONB,
  preferred_closings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_email_ai_preferences_tenant_agent ON email_ai_preferences (tenant_id, agent_id);

-- Enable RLS
ALTER TABLE email_ai_preferences ENABLE ROW LEVEL SECURITY;
