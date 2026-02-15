-- Migration: 0007
-- Description: Create compliance_rules table
-- CrestDesk Database Schema

CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100) NOT NULL,
  rule_key VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  enforcement VARCHAR(20) NOT NULL CHECK (enforcement IN ('block', 'warn', 'require', 'insert')),
  parameters JSONB DEFAULT '{}',
  applies_to VARCHAR(50)[] NOT NULL,
  effective_date DATE NOT NULL,
  superseded_date DATE,
  version INTEGER DEFAULT 1,
  source_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
