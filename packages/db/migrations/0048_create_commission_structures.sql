-- Phase 6: Commission Structures
CREATE TABLE IF NOT EXISTS commission_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID REFERENCES users(id),
  deal_type VARCHAR(30) NOT NULL DEFAULT 'residential',
  brokerage_percentage DECIMAL(5,4) NOT NULL,
  agent_percentage DECIMAL(5,4) NOT NULL,
  referral_fee_flat DECIMAL(12,2),
  referral_fee_percentage DECIMAL(5,4),
  franchise_fee_percentage DECIMAL(5,4),
  effective_date DATE NOT NULL,
  expires_date DATE,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_commission_structures_tenant ON commission_structures(tenant_id);
CREATE INDEX idx_commission_structures_agent ON commission_structures(tenant_id, agent_id);
CREATE INDEX idx_commission_structures_deal_type ON commission_structures(tenant_id, deal_type);
CREATE INDEX idx_commission_structures_effective ON commission_structures(tenant_id, effective_date);
