-- Migration: 0024_create_signatures
-- Phase 3: E-Signatures & Closing

CREATE TABLE signatures (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  signing_request_id              uuid NOT NULL REFERENCES signing_requests(id) ON DELETE RESTRICT,
  document_id                     uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  signature_field_id              uuid REFERENCES signature_fields(id) ON DELETE RESTRICT,
  signer_name                     varchar(255) NOT NULL,
  signature_image_path            varchar(500) NOT NULL,
  signature_hash                  varchar(255) NOT NULL,
  signer_ip_address               inet NOT NULL,
  signing_timestamp               timestamptz NOT NULL,
  tamper_seal                     varchar(500) NOT NULL,
  certificate_of_completion_id    uuid,
  authentication_method           varchar(50) NOT NULL,
  biometric_type                  varchar(50),
  offline_signature               boolean DEFAULT false,
  sync_verified_at                timestamptz,
  created_at                      timestamptz DEFAULT now(),
  updated_at                      timestamptz DEFAULT now()
);

CREATE INDEX idx_signatures_document ON signatures(document_id);
CREATE INDEX idx_signatures_request ON signatures(signing_request_id);
