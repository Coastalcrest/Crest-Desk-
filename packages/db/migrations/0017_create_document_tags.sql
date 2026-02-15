-- Migration: 0017_create_document_tags
-- Phase 2: Documents & Forms

CREATE TABLE document_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  tag_key     varchar(100) NOT NULL,
  tag_value   varchar(255),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_tenant ON document_tags(tenant_id);
