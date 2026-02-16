CREATE TABLE IF NOT EXISTS social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL,
  platforms JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  post_count INTEGER DEFAULT 0,
  published_count INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  is_evergreen BOOLEAN DEFAULT false,
  content_strategy JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_social_campaigns_tenant ON social_campaigns(tenant_id);
CREATE INDEX idx_social_campaigns_agent ON social_campaigns(tenant_id, agent_id);
CREATE INDEX idx_social_campaigns_status ON social_campaigns(tenant_id, status);
