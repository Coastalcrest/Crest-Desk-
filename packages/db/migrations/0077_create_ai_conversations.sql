-- Migration: 0077_create_ai_conversations.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  context_type VARCHAR(50),
  context_id UUID,
  context_page VARCHAR(255),
  context_metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ai_conversations_tenant ON ai_conversations (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_user ON ai_conversations (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_source ON ai_conversations (source) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_context ON ai_conversations (context_type, context_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_status ON ai_conversations (status) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
