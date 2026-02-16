-- Migration: 0041_create_deals
-- Phase 5: CRM & Follow-Up

CREATE TABLE deals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  contact_id          uuid NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  transaction_id      uuid REFERENCES transactions(id) ON DELETE RESTRICT,
  owner_user_id       uuid REFERENCES users(id) ON DELETE RESTRICT,
  pipeline_stage_id   uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  deal_name           varchar(255) NOT NULL,
  deal_value          numeric(12,2),
  expected_close_date date,
  probability         integer NOT NULL DEFAULT 50,
  deal_type           varchar(50),
  property_address    text,
  property_state      varchar(2),
  notes               text,
  lost_reason         varchar(255),
  won_at              timestamptz,
  lost_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

-- Indexes
CREATE INDEX idx_deals_tenant ON deals(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(pipeline_stage_id);
CREATE INDEX idx_deals_owner ON deals(owner_user_id);
CREATE INDEX idx_deals_expected_close ON deals(expected_close_date);
