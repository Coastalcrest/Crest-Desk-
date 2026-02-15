-- Migration: 0019_phase2_rls_policies
-- RLS policies for Phase 2 tables

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;

-- Transactions: tenant isolation
CREATE POLICY transactions_tenant_isolation ON transactions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Documents: tenant isolation
CREATE POLICY documents_tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Forms: tenant isolation (system forms visible to all via NULL tenant_id)
CREATE POLICY forms_tenant_isolation ON forms
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    OR tenant_id IS NULL
  );

-- Form instances: tenant isolation
CREATE POLICY form_instances_tenant_isolation ON form_instances
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Compliance checklists: tenant isolation
CREATE POLICY compliance_checklists_tenant_isolation ON compliance_checklists
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Document tags: tenant isolation
CREATE POLICY document_tags_tenant_isolation ON document_tags
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Document audit log: tenant isolation (read-only for tenants)
CREATE POLICY document_audit_log_tenant_isolation ON document_audit_log
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Document audit log: insert policy (any authenticated user in tenant)
CREATE POLICY document_audit_log_insert ON document_audit_log
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
