-- Migration: 0025_create_certificates_of_completion
-- Phase 3: E-Signatures & Closing

CREATE TABLE certificates_of_completion (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  envelope_id               uuid REFERENCES signing_envelopes(id) ON DELETE RESTRICT,
  document_id               uuid REFERENCES documents(id) ON DELETE RESTRICT,
  signer_name               varchar(255) NOT NULL,
  signer_email              varchar(255) NOT NULL,
  signing_timestamp         timestamptz NOT NULL,
  signing_location_ip       inet NOT NULL,
  signing_device_info       jsonb NOT NULL,
  jurisdiction              varchar(2) NOT NULL,
  compliance_rules_version  integer NOT NULL,
  certificate_pdf_path      varchar(500) NOT NULL,
  certificate_hash          varchar(255) NOT NULL,
  issued_by_system          boolean DEFAULT true,
  created_at                timestamptz DEFAULT now()
);

CREATE INDEX idx_certificates_envelope ON certificates_of_completion(envelope_id);
CREATE INDEX idx_certificates_document ON certificates_of_completion(document_id);
