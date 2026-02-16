-- Phase 6: Updated_at Triggers

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_commission_structures_updated_at
  BEFORE UPDATE ON commission_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_commission_splits_updated_at
  BEFORE UPDATE ON commission_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_deal_expenses_updated_at
  BEFORE UPDATE ON deal_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_agent_billing_updated_at
  BEFORE UPDATE ON agent_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
