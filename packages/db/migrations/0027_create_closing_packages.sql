-- Migration: 0027_create_closing_packages
-- Phase 3: E-Signatures & Closing

CREATE TABLE closing_packages (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id              uuid NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  package_name                varchar(255) NOT NULL,
  status                      varchar(50) NOT NULL DEFAULT 'draft',
  assembled_by                uuid REFERENCES users(id) ON DELETE RESTRICT,
  document_order              uuid[] NOT NULL DEFAULT '{}',
  table_of_contents           text NOT NULL DEFAULT '',
  package_pdf_path            varchar(500),
  package_zip_path            varchar(500),
  compliance_checklist_id     uuid,
  ready_for_closing           boolean DEFAULT false,
  submitted_to_title_company  boolean DEFAULT false,
  submission_timestamp        timestamptz,
  final_approval_by           uuid REFERENCES users(id) ON DELETE RESTRICT,
  final_approval_at           timestamptz,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  deleted_at                  timestamptz
);

CREATE INDEX idx_closing_packages_transaction ON closing_packages(transaction_id) WHERE deleted_at IS NULL;
