-- Migration: 0103_create_sdk_configurations
-- Description: Per-tenant SDK/embed configuration

CREATE TABLE IF NOT EXISTS sdk_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sdk_key VARCHAR(64) NOT NULL UNIQUE,
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  enabled_widgets TEXT[] NOT NULL DEFAULT '{}',
  theme_overrides JSONB NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sdk_configurations_tenant ON sdk_configurations(tenant_id);

-- Enable RLS
ALTER TABLE sdk_configurations ENABLE ROW LEVEL SECURITY;

-- Check constraints
ALTER TABLE sdk_configurations ADD CONSTRAINT chk_sdk_configurations_env
  CHECK (environment IN ('production', 'staging', 'development'));
