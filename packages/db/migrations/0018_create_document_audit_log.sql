-- Migration: 0018_create_document_audit_log
-- Phase 2: Documents & Forms

CREATE TABLE document_audit_log (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  document_id   uuid NOT NULL,
  action        varchar(100) NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  details       jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_doc_audit_document ON document_audit_log(document_id, created_at DESC);
CREATE INDEX idx_doc_audit_tenant ON document_audit_log(tenant_id);
