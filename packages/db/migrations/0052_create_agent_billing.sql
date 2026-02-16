-- Phase 6: Agent Billing
CREATE TABLE IF NOT EXISTS agent_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  billing_type VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_date DATE,
  qb_invoice_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_billing_tenant ON agent_billing(tenant_id);
CREATE INDEX idx_agent_billing_agent ON agent_billing(tenant_id, agent_id);
CREATE INDEX idx_agent_billing_type ON agent_billing(tenant_id, billing_type);
CREATE INDEX idx_agent_billing_status ON agent_billing(tenant_id, paid_status);
CREATE INDEX idx_agent_billing_due ON agent_billing(tenant_id, due_date);
CREATE INDEX idx_agent_billing_period ON agent_billing(tenant_id, billing_period_start, billing_period_end);
