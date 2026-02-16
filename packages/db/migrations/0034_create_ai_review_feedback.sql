-- Phase 4: Create ai_review_feedback table
CREATE TABLE IF NOT EXISTS ai_review_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  finding_id UUID NOT NULL REFERENCES review_findings(id) ON DELETE RESTRICT,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  feedback_type VARCHAR(30) NOT NULL,
  original_severity VARCHAR(20),
  adjusted_severity VARCHAR(20),
  notes TEXT,
  promoted_to_rule_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_feedback_tenant ON ai_review_feedback (tenant_id);
CREATE INDEX idx_feedback_finding ON ai_review_feedback (finding_id);
CREATE INDEX idx_feedback_reviewer ON ai_review_feedback (reviewer_id);

-- Constraints
ALTER TABLE ai_review_feedback ADD CONSTRAINT chk_feedback_type
  CHECK (feedback_type IN ('correct', 'false_positive', 'missed_issue', 'severity_adjustment'));
