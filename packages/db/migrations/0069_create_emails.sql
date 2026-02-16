-- Migration: 0069_create_emails.sql
-- Phase 9: Email Hub and AI Assistant

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email_account_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  transaction_id UUID,
  contact_id UUID,
  thread_id VARCHAR(200),
  message_id VARCHAR(300),
  in_reply_to VARCHAR(300),
  direction VARCHAR(10) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(200),
  to_addresses JSONB NOT NULL,
  cc_addresses JSONB,
  bcc_addresses JSONB,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  snippet VARCHAR(500),
  has_attachments BOOLEAN DEFAULT FALSE,
  attachments JSONB,
  labels JSONB,
  priority VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  auto_filed_to VARCHAR(50),
  ai_suggested_actions JSONB,
  compliance_status VARCHAR(30),
  compliance_issues JSONB,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_emails_tenant ON emails (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_agent ON emails (agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_account ON emails (email_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_transaction ON emails (transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_contact ON emails (contact_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_thread ON emails (thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_direction ON emails (direction) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_priority ON emails (priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_is_read ON emails (is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_received_at ON emails (received_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
