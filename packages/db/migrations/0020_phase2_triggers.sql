-- Migration: 0020_phase2_triggers
-- updated_at triggers for Phase 2 tables

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_form_instances_updated_at
  BEFORE UPDATE ON form_instances
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_compliance_checklists_updated_at
  BEFORE UPDATE ON compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
