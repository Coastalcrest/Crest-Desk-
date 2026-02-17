-- Migration: 0107_phase12_seed_subscription_plans
-- Description: Seed 4 subscription plan tiers

INSERT INTO subscription_plans (plan_code, name, description, price_monthly_cents, price_yearly_cents, max_users, max_transactions, max_api_calls_per_month, max_storage_mb, max_documents, max_webhook_endpoints, features, sort_order)
VALUES
  ('solo_agent', 'Solo Agent', 'Perfect for individual agents managing their own transactions', 4900, 47040, 1, 50, 1000, 1024, 500, 2, '{"e_signing": true, "ai_copilot": true, "crm": true, "compliance": true, "social_media": false, "white_label": false, "api_access": false}', 1),
  ('team', 'Team', 'For small teams collaborating on transactions', 3900, 37440, 10, 200, 5000, 5120, 2000, 5, '{"e_signing": true, "ai_copilot": true, "crm": true, "compliance": true, "social_media": true, "white_label": false, "api_access": true}', 2),
  ('brokerage', 'Brokerage', 'Full-featured solution for growing brokerages', 2900, 27840, 50, 1000, 25000, 25600, 10000, 10, '{"e_signing": true, "ai_copilot": true, "crm": true, "compliance": true, "social_media": true, "white_label": true, "api_access": true, "custom_domain": true}', 3),
  ('enterprise', 'Enterprise', 'Custom solution for large brokerages with dedicated support', 0, 0, 999999, 999999, 999999, 999999, 999999, 999999, '{"e_signing": true, "ai_copilot": true, "crm": true, "compliance": true, "social_media": true, "white_label": true, "api_access": true, "custom_domain": true, "sso": true, "dedicated_support": true}', 4)
ON CONFLICT (plan_code) DO NOTHING;
