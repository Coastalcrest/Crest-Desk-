-- Migration: 0002
-- Description: Create users table with FK to tenants, and add deferred FK from tenants.owner_user_id
-- CrestDesk Database Schema

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('agent', 'managing_broker', 'principal_broker', 'owner')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  licensed_states VARCHAR(2)[] DEFAULT '{}',
  license_numbers JSONB DEFAULT '{}',
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[],
  email_verified BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add FK from tenants.owner_user_id to users.id
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_owner
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT;
