-- Phase 6: Deal Expenses
CREATE TABLE IF NOT EXISTS deal_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deal_id UUID REFERENCES deals(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  vendor_id UUID REFERENCES vendors(id),
  expense_category VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  payment_date DATE,
  paid_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  receipt_data JSONB,
  tax_deductible VARCHAR(10) DEFAULT 'yes',
  irs_category_code VARCHAR(30),
  qb_sync_date TIMESTAMPTZ,
  qb_account_code VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_deal_expenses_tenant ON deal_expenses(tenant_id);
CREATE INDEX idx_deal_expenses_deal ON deal_expenses(tenant_id, deal_id);
CREATE INDEX idx_deal_expenses_agent ON deal_expenses(tenant_id, agent_id);
CREATE INDEX idx_deal_expenses_vendor ON deal_expenses(tenant_id, vendor_id);
CREATE INDEX idx_deal_expenses_category ON deal_expenses(tenant_id, expense_category);
CREATE INDEX idx_deal_expenses_paid ON deal_expenses(tenant_id, paid_status);
CREATE INDEX idx_deal_expenses_receipt_date ON deal_expenses(tenant_id, receipt_date);
