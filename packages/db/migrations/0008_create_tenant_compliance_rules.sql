-- Migration: 0008
-- Description: Create tenant_compliance_rules table
-- CrestDesk Database Schema

CREATE TABLE tenant_compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  enforcement VARCHAR(20) NOT NULL CHECK (enforcement IN ('block', 'warn', 'require')),
  parameters JSONB DEFAULT '{}',
  applies_to VARCHAR(50)[] NOT NULL,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
