-- Migration: 0088_create_trusted_devices
-- Description: Remembered devices for MFA skip

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  browser VARCHAR(100),
  os VARCHAR(100),
  last_used_at TIMESTAMPTZ,
  last_ip VARCHAR(45),
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trusted_devices_tenant_user ON trusted_devices(tenant_id, user_id);
CREATE INDEX idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE UNIQUE INDEX idx_trusted_devices_unique ON trusted_devices(tenant_id, user_id, device_fingerprint);

-- Enable RLS
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
