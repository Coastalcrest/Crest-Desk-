-- Migration: 0044_create_follow_up_messages
-- Phase 5: CRM & Follow-Up

CREATE TABLE follow_up_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  enrollment_id  uuid NOT NULL REFERENCES follow_up_enrollments(id) ON DELETE RESTRICT,
  contact_id     uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  step_number    integer NOT NULL,
  channel        varchar(50) NOT NULL,
  subject        varchar(255),
  body           text,
  status         varchar(30) NOT NULL DEFAULT 'pending',
  sent_at        timestamptz,
  delivered_at   timestamptz,
  opened_at      timestamptz,
  clicked_at     timestamptz,
  replied_at     timestamptz,
  bounced_at     timestamptz,
  failure_reason varchar(500),
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_follow_up_messages_enrollment ON follow_up_messages(enrollment_id);
CREATE INDEX idx_follow_up_messages_contact ON follow_up_messages(contact_id);
CREATE INDEX idx_follow_up_messages_status ON follow_up_messages(status);
CREATE INDEX idx_follow_up_messages_sent ON follow_up_messages(sent_at DESC);
