-- Migration: 0101_create_subscription_usage
-- Description: Per-tenant usage metering per billing period

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_subscription_usage_unique ON subscription_usage(tenant_id, event_type, period_start);
CREATE INDEX idx_subscription_usage_period ON subscription_usage(tenant_id, period_start);
CREATE INDEX idx_subscription_usage_type ON subscription_usage(tenant_id, event_type);

-- Enable RLS
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
