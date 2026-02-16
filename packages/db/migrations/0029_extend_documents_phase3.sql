-- Migration: 0029_extend_documents_phase3
-- Phase 3: Add signing columns to documents table

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_hash varchar(255),
  ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_status varchar(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS signing_deadline timestamptz;

CREATE INDEX idx_documents_signature_status ON documents(signature_status) WHERE deleted_at IS NULL AND requires_signature = true;
