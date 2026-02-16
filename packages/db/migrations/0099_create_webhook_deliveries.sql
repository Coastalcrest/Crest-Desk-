-- Migration: 0099_create_webhook_deliveries
-- Description: Insert-only webhook delivery audit log

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  attempt INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id, created_at);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, created_at);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(tenant_id, status);

-- Enable RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Check constraints
ALTER TABLE webhook_deliveries ADD CONSTRAINT chk_webhook_deliveries_status
  CHECK (status IN ('pending', 'success', 'failed', 'retrying'));
