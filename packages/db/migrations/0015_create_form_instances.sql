-- Migration: 0015_create_form_instances
-- Phase 2: Documents & Forms

CREATE TABLE form_instances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  form_id               uuid NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  transaction_id        uuid NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  filled_data           jsonb NOT NULL DEFAULT '{}',
  is_complete           boolean DEFAULT false,
  is_sent_for_signature boolean DEFAULT false,
  signature_request_id  uuid,
  created_by            uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_form_instances_transaction ON form_instances(transaction_id);
CREATE INDEX idx_form_instances_form ON form_instances(form_id);
