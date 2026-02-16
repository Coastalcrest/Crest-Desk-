-- Migration: 0047_phase5_triggers
-- Phase 5: updated_at triggers
-- Note: contact_activities and follow_up_messages are insert-only, no update trigger needed.

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_follow_up_sequences_updated_at
  BEFORE UPDATE ON follow_up_sequences
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_follow_up_enrollments_updated_at
  BEFORE UPDATE ON follow_up_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_lead_sources_updated_at
  BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
