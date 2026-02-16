-- Migration: 0026_create_signing_audit_log
-- Phase 3: E-Signatures & Closing

CREATE TABLE signing_audit_log (
  id                    bigserial PRIMARY KEY,
  tenant_id             uuid NOT NULL,
  signing_request_id    uuid NOT NULL,
  action                varchar(100) NOT NULL,
  details               jsonb DEFAULT '{}',
  ip_address            inet,
  user_agent            text,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_signing_audit_request ON signing_audit_log(signing_request_id, created_at DESC);
CREATE INDEX idx_signing_audit_tenant ON signing_audit_log(tenant_id);
