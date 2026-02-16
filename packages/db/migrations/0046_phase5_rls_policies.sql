-- Migration: 0046_phase5_rls_policies
-- Phase 5: Row-Level Security policies

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

-- contacts: tenant isolation
CREATE POLICY contacts_tenant_isolation ON contacts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- contact_activities: tenant isolation
CREATE POLICY contact_activities_tenant_isolation ON contact_activities
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- pipeline_stages: tenant isolation
CREATE POLICY pipeline_stages_tenant_isolation ON pipeline_stages
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- deals: tenant isolation
CREATE POLICY deals_tenant_isolation ON deals
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- follow_up_sequences: tenant isolation
CREATE POLICY follow_up_sequences_tenant_isolation ON follow_up_sequences
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- follow_up_enrollments: tenant isolation
CREATE POLICY follow_up_enrollments_tenant_isolation ON follow_up_enrollments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- follow_up_messages: tenant isolation
CREATE POLICY follow_up_messages_tenant_isolation ON follow_up_messages
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- lead_sources: tenant isolation
CREATE POLICY lead_sources_tenant_isolation ON lead_sources
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
