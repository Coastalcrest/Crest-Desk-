-- Phase 4: Create agent_coaching_insights table
CREATE TABLE IF NOT EXISTS agent_coaching_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  insight_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurrence TIMESTAMPTZ NOT NULL DEFAULT now(),
  example_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coaching_agent ON agent_coaching_insights (agent_user_id);
CREATE INDEX idx_coaching_tenant ON agent_coaching_insights (tenant_id);
CREATE INDEX idx_coaching_type ON agent_coaching_insights (insight_type);

-- Constraints
ALTER TABLE agent_coaching_insights ADD CONSTRAINT chk_coaching_type
  CHECK (insight_type IN ('recurring_issue', 'improvement', 'coaching_tip', 'pattern_detected'));
