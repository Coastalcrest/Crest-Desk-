-- Migration: 0023_create_signature_fields
-- Phase 3: E-Signatures & Closing

CREATE TABLE signature_fields (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  document_id           uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  signing_request_id    uuid NOT NULL REFERENCES signing_requests(id) ON DELETE RESTRICT,
  field_type            varchar(50) NOT NULL,
  page_number           integer NOT NULL,
  x_coordinate          integer NOT NULL,
  y_coordinate          integer NOT NULL,
  width                 integer NOT NULL,
  height                integer NOT NULL,
  required              boolean DEFAULT true,
  locked                boolean DEFAULT false,
  placeholder_text      varchar(255),
  status                varchar(50) NOT NULL DEFAULT 'unsigned',
  signature_image_path  varchar(500),
  signature_timestamp   timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_signature_fields_document ON signature_fields(document_id);
CREATE INDEX idx_signature_fields_request ON signature_fields(signing_request_id);
