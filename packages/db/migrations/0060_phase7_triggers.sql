-- Phase 7: Updated_at Triggers

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_asset_library_updated_at
  BEFORE UPDATE ON asset_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_media_templates_updated_at
  BEFORE UPDATE ON media_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_agent_media_prefs_updated_at
  BEFORE UPDATE ON agent_media_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
