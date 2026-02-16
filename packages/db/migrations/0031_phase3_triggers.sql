-- Migration: 0031_phase3_triggers
-- updated_at triggers for Phase 3 tables

CREATE TRIGGER set_signing_envelopes_updated_at
  BEFORE UPDATE ON signing_envelopes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_signing_requests_updated_at
  BEFORE UPDATE ON signing_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_signature_fields_updated_at
  BEFORE UPDATE ON signature_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_signatures_updated_at
  BEFORE UPDATE ON signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_closing_packages_updated_at
  BEFORE UPDATE ON closing_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
