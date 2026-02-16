CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_social_accounts_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_social_posts_updated_at BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_social_engagement_updated_at BEFORE UPDATE ON social_engagement FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_social_content_rules_updated_at BEFORE UPDATE ON social_content_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_social_campaigns_updated_at BEFORE UPDATE ON social_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
