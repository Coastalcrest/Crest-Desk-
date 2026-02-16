-- Migration: 0100_create_subscription_plans
-- Description: Global subscription plan reference data (NO tenant_id, NO RLS)

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  max_users INTEGER,
  max_transactions INTEGER,
  max_api_calls_per_month INTEGER,
  max_storage_mb INTEGER,
  max_documents INTEGER,
  max_webhook_endpoints INTEGER NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE: NO RLS on subscription_plans — this is global reference data
