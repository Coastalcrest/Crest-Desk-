-- Phase 4: Create review_queue table
CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 50,
  risk_score INTEGER DEFAULT 0,
  readiness_score INTEGER DEFAULT 0,
  assigned_reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  review_notes TEXT,
  return_reason TEXT,
  returned_to_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  returned_at TIMESTAMPTZ,
  approval_stamp_path VARCHAR(500),
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_review_queue_tenant ON review_queue (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_queue_status ON review_queue (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_review_queue_priority ON review_queue (priority) WHERE status = 'pending';
CREATE INDEX idx_review_queue_reviewer ON review_queue (assigned_reviewer_id);
CREATE INDEX idx_review_queue_transaction ON review_queue (transaction_id) WHERE deleted_at IS NULL;

-- Constraint: status must be one of the valid values
ALTER TABLE review_queue ADD CONSTRAINT chk_review_queue_status
  CHECK (status IN ('pending', 'in_review', 'approved', 'returned', 'escalated'));
