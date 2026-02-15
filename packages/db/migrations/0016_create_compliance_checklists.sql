-- Migration: 0016_create_compliance_checklists
-- Phase 2: Documents & Forms

CREATE TABLE compliance_checklists (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id        uuid NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  jurisdiction          varchar(10) NOT NULL,
  checklist_items       jsonb NOT NULL DEFAULT '[]',
  status                varchar(20) NOT NULL DEFAULT 'in_progress',
  federal_items_complete boolean DEFAULT false,
  state_items_complete  boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_checklists_transaction ON compliance_checklists(transaction_id);
CREATE INDEX idx_checklists_jurisdiction ON compliance_checklists(jurisdiction);
