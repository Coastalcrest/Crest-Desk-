-- Migration: 0073_phase9_rls_policies.sql
-- Phase 9: RLS Policies for Email Hub and AI Assistant tables

-- email_accounts: tenant isolation
CREATE POLICY email_accounts_tenant_isolation ON email_accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- emails: tenant isolation
CREATE POLICY emails_tenant_isolation ON emails
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- email_templates: tenant isolation (allows NULL tenant_id for global templates)
CREATE POLICY email_templates_tenant_isolation ON email_templates
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id')::UUID
  );

-- email_rules: tenant isolation
CREATE POLICY email_rules_tenant_isolation ON email_rules
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- email_ai_preferences: tenant isolation
CREATE POLICY email_ai_preferences_tenant_isolation ON email_ai_preferences
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
