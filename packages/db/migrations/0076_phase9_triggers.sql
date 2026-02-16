-- Migration: 0074_phase9_triggers.sql
-- Phase 9: updated_at triggers for Email Hub and AI Assistant tables

-- Reuse the shared trigger function (created in earlier migrations)
-- CREATE OR REPLACE FUNCTION update_timestamp()
-- already exists from phase 1 migrations

-- email_accounts
CREATE TRIGGER set_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- emails
CREATE TRIGGER set_emails_updated_at
  BEFORE UPDATE ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- email_templates
CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- email_rules
CREATE TRIGGER set_email_rules_updated_at
  BEFORE UPDATE ON email_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- email_ai_preferences
CREATE TRIGGER set_email_ai_preferences_updated_at
  BEFORE UPDATE ON email_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
