-- Migration: 0004
-- Description: Create permissions table
-- CrestDesk Database Schema

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('own', 'team', 'office', 'brokerage')),
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
