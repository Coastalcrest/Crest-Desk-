-- Migration: 0001
-- Description: Create tenants table
-- CrestDesk Database Schema

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_user_id UUID,  -- FK added after users table exists (see 0002)
  primary_state VARCHAR(2) NOT NULL,
  licensed_states VARCHAR(2)[] NOT NULL DEFAULT '{}',
  license_numbers JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
