-- Migration: 0091_create_breach_notification_rules
-- Description: 50-state breach notification reference data (global, NOT tenant-scoped)

CREATE TABLE IF NOT EXISTS breach_notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code CHAR(2) NOT NULL UNIQUE,
  state_name VARCHAR(100) NOT NULL,
  notification_deadline_days INTEGER,
  attorney_general_required BOOLEAN NOT NULL DEFAULT false,
  consumer_reporting_required BOOLEAN NOT NULL DEFAULT false,
  threshold_individuals INTEGER,
  statute_reference VARCHAR(255),
  notification_url TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_breach_rules_state ON breach_notification_rules(state_code);

-- NO RLS — this is global reference data
