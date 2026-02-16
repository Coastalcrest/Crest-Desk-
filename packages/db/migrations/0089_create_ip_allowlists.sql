-- Migration: 0089_create_ip_allowlists
-- Description: Optional IP restrictions per brokerage

CREATE TABLE IF NOT EXISTS ip_allowlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cidr_range VARCHAR(50) NOT NULL,
  label VARCHAR(255),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ip_allowlists_tenant ON ip_allowlists(tenant_id);
CREATE UNIQUE INDEX idx_ip_allowlists_unique ON ip_allowlists(tenant_id, cidr_range);

-- Enable RLS
ALTER TABLE ip_allowlists ENABLE ROW LEVEL SECURITY;
