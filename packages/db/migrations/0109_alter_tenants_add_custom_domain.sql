-- Migration: 0109_alter_tenants_add_custom_domain
-- Description: Add custom domain fields to tenants table

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(253);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(20) DEFAULT 'none';

-- Check constraint for domain status
ALTER TABLE tenants ADD CONSTRAINT chk_tenants_custom_domain_status
  CHECK (custom_domain_status IN ('none', 'pending', 'verified', 'failed'));

-- Partial index for custom domain lookup
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants(custom_domain)
  WHERE custom_domain IS NOT NULL;
