-- Phase 7: Agent Media Preferences
CREATE TABLE IF NOT EXISTS agent_media_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  preferred_styles JSONB,
  preferred_music_mood JSONB,
  color_preferences JSONB,
  branding_defaults JSONB,
  learned_from_edits JSONB,
  favorite_template_ids JSONB,
  favorite_asset_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_agent_media_prefs_unique ON agent_media_preferences(tenant_id, agent_id);
CREATE INDEX idx_agent_media_prefs_tenant ON agent_media_preferences(tenant_id);
