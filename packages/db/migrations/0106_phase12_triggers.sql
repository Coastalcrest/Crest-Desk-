-- Migration: 0106_phase12_triggers
-- Description: updated_at triggers and insert-only rules for Phase 12 tables

-- updated_at triggers (using update_timestamp() from migration 0011)
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_white_label_configs_updated_at
  BEFORE UPDATE ON white_label_configs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_sdk_configurations_updated_at
  BEFORE UPDATE ON sdk_configurations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_tenant_onboarding_updated_at
  BEFORE UPDATE ON tenant_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Insert-only protection for webhook_deliveries
CREATE OR REPLACE RULE webhook_deliveries_no_update AS
  ON UPDATE TO webhook_deliveries DO INSTEAD NOTHING;

CREATE OR REPLACE RULE webhook_deliveries_no_delete AS
  ON DELETE TO webhook_deliveries DO INSTEAD NOTHING;
