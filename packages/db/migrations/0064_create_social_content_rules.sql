CREATE TABLE IF NOT EXISTS social_content_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rule_type VARCHAR(50) NOT NULL,
  post_type VARCHAR(50),
  platform VARCHAR(30),
  requires_broker_approval BOOLEAN DEFAULT false,
  auto_publish BOOLEAN DEFAULT false,
  compliance_template TEXT,
  hashtag_defaults JSONB,
  branding_requirements JSONB,
  scheduling_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_social_content_rules_tenant ON social_content_rules(tenant_id);
CREATE INDEX idx_social_content_rules_type ON social_content_rules(tenant_id, rule_type);
