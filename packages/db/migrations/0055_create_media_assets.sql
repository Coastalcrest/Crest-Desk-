-- Phase 7: Media Assets
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES users(id),
  asset_type VARCHAR(30) NOT NULL,
  media_type VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  dimensions JSONB,
  duration INTEGER,
  generated_by_service VARCHAR(50),
  generation_prompt TEXT,
  generation_params JSONB,
  transaction_id UUID REFERENCES transactions(id),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  compliance_status VARCHAR(30) DEFAULT 'pending',
  compliance_issues JSONB,
  compliance_checked_at TIMESTAMPTz,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  published_platforms JSONB,
  published_at TIMESTAMPTZ,
  metadata JSONB,
  tags JSONB,
  created_at TIMESTAMPTT NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_media_assets_tenant ON media_assets(tenant_id);
CREATE INDEX idx_media_assets_agent ON media_assets(tenant_id, agent_id);
CREATE INDEX idx_media_assets_type ON media_assets(tenant_id, asset_type);
CREATE INDEX idx_media_assets_media_type ON media_assets(tenant_id, media_type);
CREATE INDEX idx_media_assets_status ON media_assets(tenant_id, status);
CREATE INDEX idx_media_assets_compliance ON media_assets(tenant_id, compliance_status);
CREATE INDEX idx_media_assets_transaction ON media_assets(tenant_id, transaction_id);
