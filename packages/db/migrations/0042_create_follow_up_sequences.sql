-- Migration: 0042_create_follow_up_sequences
-- Phase 5: CRM & Follow-Up

CREATE TABLE follow_up_sequences (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  sequence_name        varchar(255) NOT NULL,
  sequence_type        varchar(50) NOT NULL,
  description          text,
  trigger_event        varchar(100),
  is_active            boolean NOT NULL DEFAULT true,
  is_system_default    boolean NOT NULL DEFAULT false,
  steps                jsonb NOT NULL DEFAULT '[]',
  target_contact_types jsonb NOT NULL DEFAULT '[]',
  created_by           uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_follow_up_sequences_tenant ON follow_up_sequences(tenant_id);
CREATE INDEX idx_follow_up_sequences_type ON follow_up_sequences(sequence_type);
CREATE INDEX idx_follow_up_sequences_active ON follow_up_sequences(is_active);

-- Constraint: sequence_type must be a valid value
ALTER TABLE follow_up_sequences ADD CONSTRAINT chk_follow_up_sequences_type
  CHECK (sequence_type IN ('lead_nurture', 'active_transaction', 'post_close', 're_engagement', 'custom'));
