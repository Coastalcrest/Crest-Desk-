-- Phase 7: Media Templates
CREATE TABLE IF NOT EXISTS media_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  thumbnail_path TEXT,
  template_data JSONB NOT NULL,
  default_prompt TEXT,
  output_format VARCHAR(30),
  output_dimensions JSONB,
  is_global BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_media_templates_tenant ON media_templates(tenant_id);
CREATE INDEX idx_media_templates_type ON media_templates(template_type);
CREATE INDEX idx_media_templates_category ON media_templates(category);
CREATE INDEX idx_media_templates_global ON media_templates(is_global) WHERE is_global = true;
