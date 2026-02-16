-- Migration: 0086_create_security_events
-- Description: Security event logging (insert-only)

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  geo_location JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_security_events_tenant_created ON security_events(tenant_id, created_at DESC);
CREATE INDEX idx_security_events_tenant_type ON security_events(tenant_id, event_type);
CREATE INDEX idx_security_events_tenant_user ON security_events(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_security_events_tenant_severity ON security_events(tenant_id, severity);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Check constraint for event_type
ALTER TABLE security_events ADD CONSTRAINT chk_security_events_type
  CHECK (event_type IN (
    'login_success', 'login_failure', 'mfa_challenge', 'mfa_success', 'mfa_failure',
    'password_change', 'password_reset', 'session_revoked', 'suspicious_activity',
    'ip_blocked', 'device_new', 'account_locked', 'account_unlocked',
    'permission_change', 'role_change'
  ));

-- Check constraint for severity
ALTER TABLE security_events ADD CONSTRAINT chk_security_events_severity
  CHECK (severity IN ('info', 'warning', 'critical'));
