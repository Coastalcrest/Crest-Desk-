CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  social_account_id UUID REFERENCES social_accounts(id),
  transaction_id UUID REFERENCES transactions(id),
  post_type VARCHAR(50) NOT NULL,
  platform VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  content_variations JSONB,
  hashtags JSONB,
  media_asset_ids JSONB,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id VARCHAR(200),
  platform_post_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  compliance_status VARCHAR(30) DEFAULT 'pending',
  compliance_issues JSONB,
  compliance_checked_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_auto_generated BOOLEAN DEFAULT false,
  generation_prompt TEXT,
  ab_test_group VARCHAR(10),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX idx_social_posts_agent ON social_posts(tenant_id, agent_id);
CREATE INDEX idx_social_posts_platform ON social_posts(tenant_id, platform);
CREATE INDEX idx_social_posts_status ON social_posts(tenant_id, status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(tenant_id, scheduled_at);
CREATE INDEX idx_social_posts_transaction ON social_posts(tenant_id, transaction_id);
