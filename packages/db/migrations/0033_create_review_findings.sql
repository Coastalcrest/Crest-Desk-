-- Phase 4: Create review_findings table
CREATE TABLE IF NOT EXISTS review_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  review_queue_id UUID NOT NULL REFERENCES review_queue(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  source VARCHAR(30) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  rule_reference VARCHAR(255),
  jurisdiction VARCHAR(10),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  broker_action VARCHAR(30),
  broker_action_at TIMESTAMPTZ,
  broker_notes TEXT,
  ai_confidence NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_findings_review ON review_findings (review_queue_id);
CREATE INDEX idx_findings_transaction ON review_findings (transaction_id);
CREATE INDEX idx_findings_severity ON review_findings (severity) WHERE resolved = false;
CREATE INDEX idx_findings_source ON review_findings (source);

-- Constraints
ALTER TABLE review_findings ADD CONSTRAINT chk_findings_source
  CHECK (source IN ('ai_pre_review', 'broker_manual', 'compliance_engine'));
ALTER TABLE review_findings ADD CONSTRAINT chk_findings_category
  CHECK (category IN ('completeness', 'signatures', 'dates', 'names', 'compliance', 'formatting', 'other'));
ALTER TABLE review_findings ADD CONSTRAINT chk_findings_severity
  CHECK (severity IN ('critical', 'warning', 'info'));
