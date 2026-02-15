-- Migration: 0014_create_forms
-- Phase 2: Documents & Forms

CREATE TABLE forms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES tenants(id) ON DELETE RESTRICT,
  form_key          varchar(100) NOT NULL UNIQUE,
  form_name         varchar(255) NOT NULL,
  form_type         varchar(50) NOT NULL,
  jurisdiction      varchar(10) NOT NULL,
  effective_date    date NOT NULL,
  superseded_date   date,
  html_template     text NOT NULL,
  json_schema       jsonb NOT NULL,
  required_fields   text[] NOT NULL DEFAULT '{}',
  conditional_fields jsonb DEFAULT '{}',
  clause_library    jsonb DEFAULT '{}',
  version           integer DEFAULT 1,
  is_system_form    boolean DEFAULT false,
  created_by        uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_forms_jurisdiction ON forms(jurisdiction) WHERE deleted_at IS NULL;
CREATE INDEX idx_forms_key ON forms(form_key);
CREATE INDEX idx_forms_type ON forms(form_type) WHERE deleted_at IS NULL;
