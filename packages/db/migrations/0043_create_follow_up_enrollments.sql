-- Migration: 0043_create_follow_up_enrollments
-- Phase 5: CRM & Follow-Up

CREATE TABLE follow_up_enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  contact_id    uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  sequence_id   uuid NOT NULL REFERENCES follow_up_sequences(id) ON DELETE RESTRICT,
  status        varchar(30) NOT NULL DEFAULT 'active',
  current_step  integer NOT NULL DEFAULT 0,
  next_step_at  timestamptz,
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  enrolled_by   uuid REFERENCES users(id) ON DELETE RESTRICT,
  completed_at  timestamptz,
  paused_at     timestamptz,
  cancelled_at  timestamptz,
  cancel_reason varchar(255),
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_follow_up_enrollments_contact ON follow_up_enrollments(contact_id);
CREATE INDEX idx_follow_up_enrollments_sequence ON follow_up_enrollments(sequence_id);
CREATE INDEX idx_follow_up_enrollments_status ON follow_up_enrollments(status) WHERE status = 'active';
CREATE INDEX idx_follow_up_enrollments_next_step ON follow_up_enrollments(next_step_at) WHERE status = 'active';
