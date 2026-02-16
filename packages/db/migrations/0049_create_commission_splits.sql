-- Phase 6: Commission Splits
CREATE TABLE IF NOT EXISTS commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deal_id UUID NOT NULL REFERENCES deals(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  sale_price DECIMAL(14,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  gross_commission DECIMAL(14,2) NOT NULL,
  brokerage_share DECIMAL(14,2) NOT NULL,
  agent_share DECIMAL(14,2) NOT NULL,
  referral_fee DECIMAL(14,2) DEFAULT 0,
  franchise_fee DECIMAL(14,2) DEFAULT 0,
  net_agent_commission DECIMAL(14,2) NOT NULL,
  closing_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  qb_sync_date TIMESTAMPTZ,
  qb_invoice_id VARCHAR(100),
  qb_account_code VARCHAR(50),
  notes TEXT,
  corrected_from_id UUID REFERENCES commission_splits(id),
  correction_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_commission_splits_tenant ON commission_splits(tenant_id);
CREATE INDEX idx_commission_splits_deal ON commission_splits(tenant_id, deal_id);
CREATE INDEX idx_commission_splits_agent ON commission_splits(tenant_id, agent_id);
CREATE INDEX idx_commission_splits_status ON commission_splits(tenant_id, status);
CREATE INDEX idx_commission_splits_closing_date ON commission_splits(tenant_id, closing_date);
CREATE INDEX idx_commission_splits_qb_sync ON commission_splits(tenant_id, qb_sync_date);
