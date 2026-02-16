-- Migration: 0105_phase12_rls_policies
-- Description: RLS policies for Phase 12 tables

-- api_keys: tenant isolation
CREATE POLICY api_keys_tenant_isolation ON api_keys
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- webhook_endpoints: tenant isolation
CREATE POLICY webhook_endpoints_tenant_isolation ON webhook_endpoints
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- webhook_deliveries: tenant isolation
CREATE POLICY webhook_deliveries_tenant_isolation ON webhook_deliveries
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- subscription_usage: tenant isolation
CREATE POLICY subscription_usage_tenant_isolation ON subscription_usage
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- white_label_configs: tenant isolation
CREATE POLICY white_label_configs_tenant_isolation ON white_label_configs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- sdk_configurations: tenant isolation
CREATE POLICY sdk_configurations_tenant_isolation ON sdk_configurations
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- tenant_onboarding: tenant isolation
CREATE POLICY tenant_onboarding_tenant_isolation ON tenant_onboarding
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- NOTE: subscription_plans has NO RLS (global reference data)
