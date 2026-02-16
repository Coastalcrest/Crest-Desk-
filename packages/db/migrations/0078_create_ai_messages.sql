-- Migration: 0078_create_ai_messages.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE RESTRICT,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(30) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  feedback_rating INTEGER,
  feedback_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_messages_tenant ON ai_messages (tenant_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages (conversation_id);
CREATE INDEX idx_ai_messages_created ON ai_messages (created_at);

-- Enable RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
