-- Phase 6: Row-Level Security Policies

-- Enable RLS on all Phase 6 tables
ALTER TABLE commission_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_billing ENABLE ROW LEVEL SECURITY;

-- Commission Structures
CREATE POLICY commission_structures_tenant_isolation ON commission_structures
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Commission Splits
CREATE POLICY commission_splits_tenant_isolation ON commission_splits
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Vendors
CREATE POLICY vendors_tenant_isolation ON vendors
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Deal Expenses
CREATE POLICY deal_expenses_tenant_isolation ON deal_expenses
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Agent Billing
CREATE POLICY agent_billing_tenant_isolation ON agent_billing
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
