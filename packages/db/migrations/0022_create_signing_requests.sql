-- Migration: 0022_create_signing_requests
-- Phase 3: E-Signatures & Closing

CREATE TABLE signing_requests (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  envelope_id               uuid NOT NULL REFERENCES signing_envelopes(id) ON DELETE RESTRICT,
  signer_id                 uuid,
  signer_email              varchar(255) NOT NULL,
  signer_name               varchar(255) NOT NULL,
  signer_role               varchar(50) NOT NULL,
  signing_order             integer NOT NULL,
  status                    varchar(50) NOT NULL DEFAULT 'pending',
  signing_link              varchar(500) NOT NULL,
  signing_link_expires_at   timestamptz NOT NULL,
  sent_at                   timestamptz,
  opened_at                 timestamptz,
  signed_at                 timestamptz,
  declined_reason           text,
  ip_address                inet,
  device_info               jsonb DEFAULT '{}',
  geo_location              jsonb,
  requires_witness          boolean DEFAULT false,
  witness_signer_request_id uuid,
  requires_notary           boolean DEFAULT false,
  notary_verified           boolean DEFAULT false,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  deleted_at                timestamptz
);

CREATE INDEX idx_signing_requests_envelope ON signing_requests(envelope_id) WHERE status != 'archived';
CREATE INDEX idx_signing_requests_signer ON signing_requests(signer_email) WHERE status = 'pending';
CREATE INDEX idx_signing_requests_link ON signing_requests(signing_link);
