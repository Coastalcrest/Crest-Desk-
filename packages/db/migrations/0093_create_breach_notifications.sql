-- Migration: 0093_create_breach_notifications
-- Description: Per-state notification obligations for breach incidents

CREATE TABLE IF NOT EXISTS breach_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES breach_incidents(id) ON DELETE CASCADE,
  state_code CHAR(2) NOT NULL,
  notification_type VARCHAR(30) NOT NULL DEFAULT 'attorney_general',
  deadline_date DATE,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_breach_notifications_tenant ON breach_notifications(tenant_id);
CREATE INDEX idx_breach_notifications_incident ON breach_notifications(incident_id);
CREATE INDEX idx_breach_notifications_status ON breach_notifications(tenant_id, status);

-- Enable RLS
ALTER TABLE breach_notifications ENABLE ROW LEVEL SECURITY;

-- Check constraints
ALTER TABLE breach_notifications ADD CONSTRAINT chk_breach_notifications_type
  CHECK (notification_type IN ('attorney_general', 'consumer', 'credit_bureau'));

ALTER TABLE breach_notifications ADD CONSTRAINT chk_breach_notifications_status
  CHECK (status IN ('pending', 'sent', 'acknowledged', 'overdue'));
