CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  platform VARCHAR(30) NOT NULL,
  account_type VARCHAR(30) NOT NULL DEFAULT 'personal',
  account_name VARCHAR(200) NOT NULL,
  account_id VARCHAR(200),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes JSONB,
  profile_url TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  connection_health VARCHAR(20) DEFAULT 'healthy',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_social_accounts_tenant ON social_accounts(tenant_id);
CREATE INDEX idx_social_accounts_agent ON social_accounts(tenant_id, agent_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(tenant_id, platform);
