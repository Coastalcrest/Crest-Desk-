-- Phase 7: Row-Level Security Policies

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_media_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_assets_tenant_isolation ON media_assets
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY asset_library_tenant_isolation ON asset_library
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY media_templates_tenant_isolation ON media_templates
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY agent_media_prefs_tenant_isolation ON agent_media_preferences
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
