-- Migration: 0102_create_white_label_configs
-- Description: Per-tenant white-label configuration (one row per tenant)

CREATE TABLE IF NOT EXISTS white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  custom_domain VARCHAR(253),
  custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  custom_domain_verified_at TIMESTAMPTZ,
  email_from_name VARCHAR(100),
  email_from_domain VARCHAR(253),
  email_reply_to VARCHAR(320),
  custom_css TEXT,
  login_page_html TEXT,
  favicon_url VARCHAR(500),
  powered_by_visible BOOLEAN NOT NULL DEFAULT true,
  embed_enabled BOOLEAN NOT NULL DEFAULT false,
  embed_allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  sdk_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
