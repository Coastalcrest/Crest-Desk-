-- Migration: 0092_create_breach_incidents
-- Description: Per-tenant breach incident tracking

CREATE TABLE IF NOT EXISTS breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_number VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'detected',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  affected_records_count INTEGER DEFAULT 0,
  affected_states TEXT[] DEFAULT '{}',
  data_types_exposed TEXT[] DEFAULT '{}',
  root_cause TEXT,
  remediation_steps TEXT,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_breach_incidents_tenant ON breach_incidents(tenant_id);
CREATE INDEX idx_breach_incidents_status ON breach_incidents(tenant_id, status);
CREATE UNIQUE INDEX idx_breach_incidents_number ON breach_incidents(tenant_id, incident_number);

-- Enable RLS
ALTER TABLE breach_incidents ENABLE ROW LEVEL SECURITY;

-- Check constraints
ALTER TABLE breach_incidents ADD CONSTRAINT chk_breach_incidents_severity
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE breach_incidents ADD CONSTRAINT chk_breach_incidents_status
  CHECK (status IN ('detected', 'investigating', 'contained', 'resolved', 'closed'));
