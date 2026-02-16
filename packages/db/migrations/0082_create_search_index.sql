-- Migration: 0082_create_search_index.sql
-- Phase 10: CrestAI Copilot & CrestAssist

CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_search_index_tenant ON search_index (tenant_id);
CREATE INDEX idx_search_index_entity ON search_index (entity_type, entity_id);
CREATE INDEX idx_search_index_vector ON search_index USING GIN (search_vector);
CREATE INDEX idx_search_index_title ON search_index USING GIN (to_tsvector('english', title));
CREATE UNIQUE INDEX idx_search_index_unique_entity ON search_index (tenant_id, entity_type, entity_id);

-- Enable RLS
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
