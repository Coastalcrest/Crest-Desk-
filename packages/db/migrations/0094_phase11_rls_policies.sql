-- Migration: 0094_phase11_rls_policies
-- Description: RLS policies for Phase 11 security tables

-- security_events: tenant isolation
CREATE POLICY security_events_tenant_isolation ON security_events
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- login_history: tenant isolation
CREATE POLICY login_history_tenant_isolation ON login_history
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- trusted_devices: tenant isolation
CREATE POLICY trusted_devices_tenant_isolation ON trusted_devices
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ip_allowlists: tenant isolation
CREATE POLICY ip_allowlists_tenant_isolation ON ip_allowlists
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- security_policies: tenant isolation
CREATE POLICY security_policies_tenant_isolation ON security_policies
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- breach_incidents: tenant isolation
CREATE POLICY breach_incidents_tenant_isolation ON breach_incidents
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- breach_notifications: tenant isolation
CREATE POLICY breach_notifications_tenant_isolation ON breach_notifications
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- NOTE: breach_notification_rules has NO RLS (global reference data)
