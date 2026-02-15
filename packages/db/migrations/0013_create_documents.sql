-- Migration: 0013_create_documents
-- Phase 2: Documents & Forms

CREATE TABLE documents (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id            uuid REFERENCES transactions(id) ON DELETE RESTRICT,
  document_type             varchar(100) NOT NULL,
  classification_confidence numeric(3,2),
  original_filename         varchar(255) NOT NULL,
  s3_key                    varchar(500) NOT NULL UNIQUE,
  s3_bucket                 varchar(100) DEFAULT 'crestdesk-documents',
  file_size_bytes           bigint NOT NULL,
  mime_type                 varchar(50) NOT NULL,
  is_scanned                boolean DEFAULT false,
  extracted_data            jsonb DEFAULT '{}',
  version_of_document_id    uuid REFERENCES documents(id) ON DELETE RESTRICT,
  is_signed                 boolean DEFAULT false,
  signed_at                 timestamptz,
  is_compliant              boolean,
  compliance_issues         jsonb DEFAULT '{}',
  folder_path               varchar(500),
  uploaded_by               uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  deleted_at                timestamptz
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_transaction ON documents(transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
