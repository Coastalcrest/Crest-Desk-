-- Phase 4: updated_at triggers
CREATE TRIGGER trg_review_queue_updated_at
  BEFORE UPDATE ON review_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_review_findings_updated_at
  BEFORE UPDATE ON review_findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_agent_coaching_insights_updated_at
  BEFORE UPDATE ON agent_coaching_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
