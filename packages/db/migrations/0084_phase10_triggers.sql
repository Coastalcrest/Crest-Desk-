-- Migration: 0084_phase10_triggers.sql
-- Phase 10: CrestAI Copilot & CrestAssist — Triggers

-- updated_at triggers using update_timestamp() from migration 0011
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_support_ticket_comments_updated_at
  BEFORE UPDATE ON support_ticket_comments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_search_index_updated_at
  BEFORE UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search_index_vector
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
