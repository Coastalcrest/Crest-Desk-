-- Phase 6: Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_name VARCHAR(200) NOT NULL,
  vendor_type VARCHAR(50) NOT NULL,
  contact_name VARCHAR(200),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(30),
  address TEXT,
  payment_terms VARCHAR(30) DEFAULT 'net_30',
  requires_1099 BOOLEAN DEFAULT false,
  tax_id VARCHAR(20),
  ytd_payments DECIMAL(14,2) DEFAULT 0,
  performance_rating DECIMAL(3,2),
  avg_turnaround_days DECIMAL(6,1),
  qb_vendor_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_type ON vendors(tenant_id, vendor_type);
CREATE INDEX idx_vendors_name ON vendors(tenant_id, vendor_name);
CREATE INDEX idx_vendors_1099 ON vendors(tenant_id, requires_1099) WHERE requires_1099 = true;
