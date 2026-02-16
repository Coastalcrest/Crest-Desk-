ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_content_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_accounts_tenant_isolation ON social_accounts
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY social_posts_tenant_isolation ON social_posts
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY social_engagement_tenant_isolation ON social_engagement
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY social_content_rules_tenant_isolation ON social_content_rules
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY social_campaigns_tenant_isolation ON social_campaigns
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
