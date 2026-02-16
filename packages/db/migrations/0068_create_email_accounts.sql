-- Migration: 0068_create_email_accounts.sql
-- Phase 9: Email Hub and AI Assistant

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  provider VARCHAR(30) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(200),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes JSONB,
  imap_host VARCHAR(200),
  imap_port VARCHAR(10),
  smtp_host VARCHAR(200),
  smtp_port VARCHAR(10),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'idle',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_accounts_tenant ON email_accounts (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_accounts_agent ON email_accounts (agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_accounts_provider ON email_accounts (provider) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_accounts_email_address ON email_accounts (email_address) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
