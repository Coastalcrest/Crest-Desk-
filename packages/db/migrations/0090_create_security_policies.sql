-- Migration: 0090_create_security_policies
-- Description: Per-tenant security configuration (one row per tenant)

CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  min_password_length INTEGER NOT NULL DEFAULT 12,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_numbers BOOLEAN NOT NULL DEFAULT true,
  require_special_chars BOOLEAN NOT NULL DEFAULT true,
  max_password_age_days INTEGER NOT NULL DEFAULT 90,
  password_history_count INTEGER NOT NULL DEFAULT 5,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
  max_concurrent_sessions INTEGER NOT NULL DEFAULT 5,
  mfa_required_roles TEXT[] NOT NULL DEFAULT '{owner,principal_broker}',
  ip_allowlist_enabled BOOLEAN NOT NULL DEFAULT false,
  lockout_threshold INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
