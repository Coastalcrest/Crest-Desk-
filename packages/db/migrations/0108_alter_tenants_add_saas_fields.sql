-- Migration: 0108_alter_tenants_add_saas_fields
-- Description: Add billing and SaaS fields to tenants table

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email VARCHAR(320);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Partial index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
