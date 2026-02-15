-- Migration: 0012_create_transactions
-- Phase 2: Documents & Forms

CREATE TABLE transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  property_address text NOT NULL,
  property_state varchar(2) NOT NULL,
  buyer_name    varchar(255),
  seller_name   varchar(255),
  list_price    numeric(12,2),
  purchase_price numeric(12,2),
  closing_date  date,
  transaction_type varchar(50) NOT NULL,
  status        varchar(50) NOT NULL DEFAULT 'draft',
  created_by    uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_state ON transactions(property_state) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_status ON transactions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_created_by ON transactions(created_by) WHERE deleted_at IS NULL;
