-- Phase 7: Asset Library
CREATE TABLE IF NOT EXISTS asset_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  name VARCHAR(300) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  license_type VARCHAR(50) NOT NULL DEFAULT 'royalty_free',
  tags JSONB,
  metadata JSONB,
  is_global BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  seasonal_month INTEGER,
  sort_order INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTT NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_asset_library_tenant ON asset_library(tenant_id);
CREATE INDEX idx_asset_library_category ON asset_library(category);
CREATE INDEX idx_asset_library_global ON asset_library(is_global) WHERE is_global = true;
CREATE INDEX idx_asset_library_seasonal ON asset_library(is_seasonal, seasonal_month) WHERE is_seasonal = true;
