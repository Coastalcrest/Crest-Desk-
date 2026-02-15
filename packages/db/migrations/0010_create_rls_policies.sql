-- Migration: 0010
-- Description: Row-Level Security policies for tenant isolation
-- CrestDesk Database Schema
--
-- All tenant-scoped tables use current_setting('app.current_tenant_id')::uuid
-- which must be set by the application layer before each request.

-- ============================================================
-- Enable RLS on tenant-scoped tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users: full CRUD scoped to tenant
-- ============================================================
CREATE POLICY tenant_isolation_users
  ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- sessions: full CRUD scoped to tenant
-- ============================================================
CREATE POLICY tenant_isolation_sessions
  ON sessions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- permissions: full CRUD scoped to tenant
-- ============================================================
CREATE POLICY tenant_isolation_permissions
  ON permissions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- tenant_compliance_rules: full CRUD scoped to tenant
-- ============================================================
CREATE POLICY tenant_isolation_tenant_compliance_rules
  ON tenant_compliance_rules
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- audit_log: insert-only with tenant-scoped reads
-- ============================================================
CREATE POLICY audit_log_insert
  ON audit_log
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY audit_log_select
  ON audit_log
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
