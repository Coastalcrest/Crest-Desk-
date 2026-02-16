-- Phase 9: Email Hub — email_ai_preferences table
CREATE TABLE IF NOT EXISTS email_ai_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  voice_tone            VARCHAR(50) DEFAULT 'professional',
  writing_style         VARCHAR(50) DEFAULT 'concise',
  signature_preference  VARCHAR(50) DEFAULT 'formal',
  auto_summarize        BOOLEAN DEFAULT TRUE,
  auto_categories       BOOLEAN DEFAULT TRUE,
  suggest_replies       BOOLEAN DEFAULT TRUE,
  smart_priority        BOOLEAN DEFAULT TRUE,
  learned_phrases       JSONB DEFAULT '[]',
  avoid_phrases         JSONB DEFAULT '[]',
  custom_instructions   TEXT,
  training_examples     JSONB DEFAULT '[]',
  language_preference   VARCHAR(10) DEFAULT 'en',
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_ai_prefs_tenant ON email_ai_preferences (tenant_id);
CREATE INDEX idx_email_ai_prefs_user ON email_ai_preferences (user_id);

-- RLS
ALTER TABLE email_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_ai_prefs_tenant_isolation ON email_ai_preferences
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
