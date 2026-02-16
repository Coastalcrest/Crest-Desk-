-- Migration: 0095_phase11_triggers
-- Description: updated_at triggers and insert-only rules for Phase 11 tables

-- updated_at triggers (using update_timestamp() from migration 0011)
CREATE TRIGGER trg_trusted_devices_updated_at
  BEFORE UPDATE ON trusted_devices
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_ip_allowlists_updated_at
  BEFORE UPDATE ON ip_allowlists
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_security_policies_updated_at
  BEFORE UPDATE ON security_policies
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_breach_incidents_updated_at
  BEFORE UPDATE ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_breach_notifications_updated_at
  BEFORE UPDATE ON breach_notifications
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_breach_notification_rules_updated_at
  BEFORE UPDATE ON breach_notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Insert-only protection for security_events (allow resolution fields to be updated)
CREATE OR REPLACE RULE security_events_no_delete AS
  ON DELETE TO security_events DO INSTEAD NOTHING;

-- Insert-only protection for login_history
CREATE OR REPLACE RULE login_history_no_update AS
  ON UPDATE TO login_history DO INSTEAD NOTHING;

CREATE OR REPLACE RULE login_history_no_delete AS
  ON DELETE TO login_history DO INSTEAD NOTHING;
