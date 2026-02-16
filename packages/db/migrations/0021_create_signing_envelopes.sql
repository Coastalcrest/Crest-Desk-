-- Migration: 0021_create_signing_envelopes
-- Phase 3: E-Signatures & Closing

CREATE TABLE signing_envelopes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id    uuid NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  envelope_name     varchar(255) NOT NULL,
  status            varchar(50) NOT NULL DEFAULT 'draft',
  created_by        uuid REFERENCES users(id) ON DELETE RESTRICT,
  document_ids      uuid[] NOT NULL DEFAULT '{}',
  signing_order     jsonb NOT NULL DEFAULT '[]',
  signing_deadline  timestamptz NOT NULL,
  completed_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX idx_signing_envelopes_transaction ON signing_envelopes(transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_signing_envelopes_status ON signing_envelopes(status) WHERE deleted_at IS NULL;
