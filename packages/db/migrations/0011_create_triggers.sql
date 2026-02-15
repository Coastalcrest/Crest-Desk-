-- Migration: 0011
-- Description: Auto-update triggers for updated_at columns
-- CrestDesk Database Schema

-- ============================================================
-- Reusable trigger function: sets updated_at to now()
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Apply trigger to tenants
-- ============================================================
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Apply trigger to users
-- ============================================================
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Apply trigger to feature_flags
-- ============================================================
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Apply trigger to compliance_rules
-- ============================================================
CREATE TRIGGER trg_compliance_rules_updated_at
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
