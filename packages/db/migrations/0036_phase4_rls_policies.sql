-- Phase 4: Row-Level Security policies
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_coaching_insights ENABLE ROW LEVEL SECURITY;

-- review_queue: tenant isolation
CREATE POLICY review_queue_tenant_isolation ON review_queue
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- review_findings: tenant isolation
CREATE POLICY review_findings_tenant_isolation ON review_findings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ai_review_feedback: tenant isolation
CREATE POLICY ai_review_feedback_tenant_isolation ON ai_review_feedback
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- agent_coaching_insights: tenant isolation
CREATE POLICY agent_coaching_insights_tenant_isolation ON agent_coaching_insights
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
