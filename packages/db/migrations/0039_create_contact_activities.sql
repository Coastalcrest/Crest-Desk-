-- Migration: 0039_create_contact_activities
-- Phase 5: CRM & Follow-Up

CREATE TABLE contact_activities (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  contact_id             uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  user_id                uuid REFERENCES users(id) ON DELETE RESTRICT,
  activity_type          varchar(50) NOT NULL,
  subject                varchar(255),
  description            text,
  metadata               jsonb,
  related_transaction_id uuid REFERENCES transactions(id) ON DELETE RESTRICT,
  related_document_id    uuid REFERENCES documents(id) ON DELETE RESTRICT,
  channel                varchar(50),
  direction              varchar(20),
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contact_activities_contact ON contact_activities(contact_id);
CREATE INDEX idx_contact_activities_tenant ON contact_activities(tenant_id);
CREATE INDEX idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX idx_contact_activities_created ON contact_activities(created_at DESC);
