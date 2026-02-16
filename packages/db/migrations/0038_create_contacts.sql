-- Migration: 0038_create_contacts
-- Phase 5: CRM & Follow-Up

CREATE TABLE contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  owner_user_id     uuid REFERENCES users(id) ON DELETE RESTRICT,
  first_name        varchar(255) NOT NULL,
  last_name         varchar(255) NOT NULL,
  email             varchar(255),
  email_secondary   varchar(255),
  phone             varchar(50),
  phone_secondary   varchar(50),
  phone_type        varchar(20),
  preferred_channel varchar(20) NOT NULL DEFAULT 'email',
  company           varchar(255),
  job_title         varchar(255),
  mailing_address   text,
  mailing_city      varchar(100),
  mailing_state     varchar(2),
  mailing_zip       varchar(10),
  birthday          date,
  anniversary       date,
  source            varchar(100),
  source_detail     varchar(255),
  contact_type      varchar(50) NOT NULL DEFAULT 'lead',
  relationship_score integer NOT NULL DEFAULT 50,
  lead_score        integer NOT NULL DEFAULT 0,
  tags              jsonb NOT NULL DEFAULT '[]',
  custom_fields     jsonb NOT NULL DEFAULT '{}',
  social_profiles   jsonb NOT NULL DEFAULT '{}',
  family_members    jsonb NOT NULL DEFAULT '[]',
  notes             text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  do_not_contact    boolean NOT NULL DEFAULT false,
  sms_consent       boolean NOT NULL DEFAULT false,
  sms_consent_date  timestamptz,
  unsubscribed_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- Indexes
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_contacts_next_follow_up ON contacts(next_follow_up_at) WHERE deleted_at IS NULL AND next_follow_up_at IS NOT NULL;
