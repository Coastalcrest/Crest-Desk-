CREATE TABLE IF NOT EXISTS social_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  post_id UUID NOT NULL REFERENCES social_posts(id),
  platform VARCHAR(30) NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  engagement_rate VARCHAR(10),
  leads_generated INTEGER DEFAULT 0,
  platform_metrics JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_engagement_tenant ON social_engagement(tenant_id);
CREATE INDEX idx_social_engagement_post ON social_engagement(post_id);
CREATE INDEX idx_social_engagement_platform ON social_engagement(tenant_id, platform);
