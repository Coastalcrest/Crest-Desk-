-- Migration: 0087_create_login_history
-- Description: Complete login audit trail (insert-only)

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_method VARCHAR(20) NOT NULL DEFAULT 'password',
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  geo_location JSONB DEFAULT '{}',
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_login_history_tenant_user ON login_history(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_login_history_tenant_created ON login_history(tenant_id, created_at DESC);
CREATE INDEX idx_login_history_tenant_ip ON login_history(tenant_id, ip_address);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Check constraint for login_method
ALTER TABLE login_history ADD CONSTRAINT chk_login_history_method
  CHECK (login_method IN ('password', 'mfa', 'sso', 'refresh'));
