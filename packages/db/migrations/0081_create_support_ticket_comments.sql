-- Migration: 0081_create_support_ticket_comments.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ticket_comments_tenant ON support_ticket_comments (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ticket_comments_ticket ON support_ticket_comments (ticket_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
