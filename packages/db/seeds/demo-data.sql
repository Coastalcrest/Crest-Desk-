-- ============================================================
-- CrestDesk Demo Data Seed
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================

-- Demo Tenant
INSERT INTO tenants (id, name, slug, primary_state, licensed_states, license_numbers, branding, settings, subscription_plan, subscription_status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Coastal Crest Realty LLC',
  'coastal-crest-demo',
  'OR',
  ARRAY['OR', 'WA'],
  '{"OR": "OR-2024-DEMO", "WA": "WA-2024-DEMO"}',
  '{"companyName": "Coastal Crest Realty LLC", "primaryColor": "#1E40AF"}',
  '{"timezone": "America/Los_Angeles", "defaultState": "OR"}',
  'brokerage',
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Demo Users (passwords set by create-test-users.ts after this seed)
-- Managing Broker
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'broker@demo.crestdesk.com',
  'Sarah',
  'Mitchell',
  'managing_broker',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
  ARRAY['OR', 'WA'],
  '{"OR": "OR-202400001", "WA": "WA-202400001"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Agent 1
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'alex@demo.crestdesk.com',
  'Alex',
  'Rivera',
  'agent',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
  ARRAY['OR'],
  '{"OR": "OR-202400002"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Agent 2
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'jordan@demo.crestdesk.com',
  'Jordan',
  'Chen',
  'agent',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
  ARRAY['OR', 'WA'],
  '{"OR": "OR-202400003", "WA": "WA-202400003"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Agent 3
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'maya@demo.crestdesk.com',
  'Maya',
  'Patel',
  'agent',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
  ARRAY['OR'],
  '{"OR": "OR-202400004"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Office staff (using 'agent' role since schema only allows agent/managing_broker/principal_broker/owner)
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, password_hash, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'office@demo.crestdesk.com',
  'Taylor',
  'Williams',
  'agent',
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Demo Contacts (owner_user_id, contact_type, separate address fields, tags as jsonb)
INSERT INTO contacts (id, tenant_id, owner_user_id, first_name, last_name, email, phone, contact_type, source, mailing_address, mailing_city, mailing_state, mailing_zip, tags, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Robert', 'Johnson', 'robert.j@example.com', '(503) 555-0101', 'buyer', 'referral',
   '1234 NE Broadway', 'Portland', 'OR', '97232',
   '["first-time-buyer", "pre-approved"]', NOW()),

  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Lisa', 'Nguyen', 'lisa.n@example.com', '(503) 555-0102', 'seller', 'website',
   '5678 SE Hawthorne', 'Portland', 'OR', '97214',
   '["downsizing", "motivated"]', NOW()),

  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'Michael', 'Thompson', 'michael.t@example.com', '(360) 555-0103', 'buyer', 'open_house',
   '910 Main St', 'Vancouver', 'WA', '98660',
   '["investor", "cash-buyer"]', NOW()),

  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'Emily', 'Davis', 'emily.d@example.com', '(503) 555-0104', 'seller', 'past_client',
   '2468 NW 23rd Ave', 'Portland', 'OR', '97210',
   '["luxury", "relocation"]', NOW()),

  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'David', 'Wilson', 'david.w@example.com', '(503) 555-0105', 'buyer', 'referral',
   '1357 SE Division', 'Portland', 'OR', '97202',
   '["move-up-buyer"]', NOW()),

  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'Jennifer', 'Martinez', 'jennifer.m@example.com', '(971) 555-0106', 'lead', 'social_media',
   '864 N Mississippi Ave', 'Portland', 'OR', '97227',
   '["condo-buyer", "first-time-buyer"]', NOW()),

  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'James', 'Anderson', 'james.a@example.com', '(503) 555-0107', 'vendor', 'direct',
   '111 SW 5th Ave', 'Portland', 'OR', '97204',
   '["inspector", "preferred-vendor"]', NOW()),

  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Patricia', 'Brown', 'patricia.b@example.com', '(503) 555-0108', 'vendor', 'direct',
   '222 NW Everett St', 'Portland', 'OR', '97209',
   '["title-company", "preferred-vendor"]', NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Transactions (property_address, property_state, transaction_type, status, created_by, purchase_price)
INSERT INTO transactions (id, tenant_id, created_by, transaction_type, status, property_address, property_state, purchase_price, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'buy', 'active', '4521 NE Glisan St, Portland, OR 97213', 'OR', 525000.00, NOW()),

  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'sell', 'pending', '5678 SE Hawthorne Blvd, Portland, OR 97214', 'OR', 685000.00, NOW()),

  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'buy', 'active', '910 Main St Unit 4B, Vancouver, WA 98660', 'WA', 380000.00, NOW()),

  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'sell', 'active', '2468 NW 23rd Ave, Portland, OR 97210', 'OR', 1250000.00, NOW()),

  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'buy', 'pending', '1357 SE Division St, Portland, OR 97202', 'OR', 475000.00, NOW()),

  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'sell', 'closed', '7890 N Lombard St, Portland, OR 97203', 'OR', 415000.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Pipeline Stages (stage_name, stage_order, stage_color)
INSERT INTO pipeline_stages (id, tenant_id, stage_name, stage_order, stage_color, is_default, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'New Lead', 1, '#6366f1', true, NOW()),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'Contacted', 2, '#8b5cf6', false, NOW()),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 'Qualified', 3, '#a855f7', false, NOW()),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', 'Showing Properties', 4, '#d946ef', false, NOW()),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000001', 'Offer Made', 5, '#ec4899', false, NOW()),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000001', 'Under Contract', 6, '#f43f5e', false, NOW()),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000001', 'Closed', 7, '#10b981', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Deals (deal_name, deal_value, pipeline_stage_id, owner_user_id)
INSERT INTO deals (id, tenant_id, contact_id, pipeline_stage_id, deal_name, deal_value, probability, owner_user_id, notes, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000304',
   'Robert Johnson - First Home', 525000.00, 60, '00000000-0000-0000-0000-000000000011',
   'Looking at homes in NE Portland. Budget 500-550K.', NOW()),

  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000305',
   'Michael Thompson - Investment Property', 380000.00, 80, '00000000-0000-0000-0000-000000000012',
   'Cash buyer, looking for multi-family in Vancouver.', NOW()),

  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000302',
   'Jennifer Martinez - Condo Search', 350000.00, 30, '00000000-0000-0000-0000-000000000013',
   'First-time buyer from social media lead.', NOW()),

  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000306',
   'Emily Davis - NW Portland Listing', 1250000.00, 90, '00000000-0000-0000-0000-000000000012',
   'Under contract. Buyer financing contingency expires next week.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Commission Structures (matches actual schema: brokerage_percentage, agent_percentage, effective_date)
INSERT INTO commission_structures (id, tenant_id, deal_type, brokerage_percentage, agent_percentage, effective_date, is_default, notes, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001',
   'residential', 0.3000, 0.7000, '2024-01-01', true,
   'Standard 70/30 split for residential transactions', NOW()),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000001',
   'residential', 0.4000, 0.6000, '2024-01-01', false,
   'New agent 60/40 split', NOW())
ON CONFLICT (id) DO NOTHING;
