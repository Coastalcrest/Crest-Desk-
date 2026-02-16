-- Migration: 0104_create_tenant_onboarding
-- Description: Onboarding progress tracking for new SaaS signups (one row per tenant)

CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  current_step VARCHAR(50) NOT NULL DEFAULT 'account_created',
  steps_completed TEXT[] NOT NULL DEFAULT '{}',
  brokerage_name VARCHAR(255),
  primary_state CHAR(2),
  license_number VARCHAR(100),
  team_size_estimate VARCHAR(20),
  referral_source VARCHAR(100),
  onboarding_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  onboarding_completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_onboarding ENABLE ROW LEVEL SECURITY;
