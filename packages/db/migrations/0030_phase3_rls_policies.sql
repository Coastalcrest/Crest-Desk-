-- Migration: 0030_phase3_rls_policies
-- RLS policies for Phase 3 tables

ALTER TABLE signing_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates_of_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY signing_envelopes_tenant_isolation ON signing_envelopes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY signing_requests_tenant_isolation ON signing_requests
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY signature_fields_tenant_isolation ON signature_fields
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY signatures_tenant_isolation ON signatures
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY certificates_tenant_isolation ON certificates_of_completion
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY signing_audit_log_tenant_read ON signing_audit_log
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY signing_audit_log_tenant_insert ON signing_audit_log
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY closing_packages_tenant_isolation ON closing_packages
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
