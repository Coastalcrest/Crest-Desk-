-- Migration: 0009
-- Description: Create all performance indexes
-- CrestDesk Database Schema

-- Users: tenant lookup with soft-delete filter
CREATE INDEX idx_users_tenant
  ON users(tenant_id)
  WHERE deleted_at IS NULL;

-- Users: email lookup with soft-delete filter
CREATE INDEX idx_users_email
  ON users(email)
  WHERE deleted_at IS NULL;

-- Sessions: active sessions per user (exclude revoked)
CREATE INDEX idx_sessions_user
  ON sessions(user_id)
  WHERE revoked_at IS NULL;

-- Sessions: token-based lookup for refresh token validation
CREATE INDEX idx_sessions_token
  ON sessions(refresh_token_hash);

-- Audit log: tenant-scoped queries ordered by time (most recent first)
CREATE INDEX idx_audit_tenant_time
  ON audit_log(tenant_id, created_at DESC);

-- Audit log: resource-specific lookups
CREATE INDEX idx_audit_resource
  ON audit_log(resource_type, resource_id);

-- Compliance rules: jurisdiction + category filtering
CREATE INDEX idx_compliance_jurisdiction
  ON compliance_rules(jurisdiction, category);

-- Compliance rules: rule_key lookup
CREATE INDEX idx_compliance_key
  ON compliance_rules(rule_key);

-- Feature flags: key lookup
CREATE INDEX idx_feature_flags_key
  ON feature_flags(key);
