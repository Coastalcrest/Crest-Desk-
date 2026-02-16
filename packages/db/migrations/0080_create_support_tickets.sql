-- Migration: 0080_create_support_tickets.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  ticket_number VARCHAR(20) NOT NULL,
  subject VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  context_page VARCHAR(255),
  context_metadata JSONB DEFAULT '{}',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_support_tickets_tenant ON support_tickets (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_user ON support_tickets (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_status ON support_tickets (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_number ON support_tickets (ticket_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_priority ON support_tickets (priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_conversation ON support_tickets (conversation_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
