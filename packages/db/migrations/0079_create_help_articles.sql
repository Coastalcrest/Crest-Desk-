-- Migration: 0079_create_help_articles.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  slug VARCHAR(200) NOT NULL,
  title VARCHAR(300) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  feature_area VARCHAR(100),
  applicable_roles JSONB DEFAULT '[]',
  applicable_states JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_help_articles_tenant ON help_articles (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_articles_slug ON help_articles (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_articles_category ON help_articles (category) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_articles_feature ON help_articles (feature_area) WHERE deleted_at IS NULL;
CREATE INDEX idx_help_articles_published ON help_articles (is_published) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
