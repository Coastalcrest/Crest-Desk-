-- ============================================================
-- CrestDesk Demo Data Seed
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================

-- Demo Tenant
INSERT INTO tenants (id, name, company_name, domain, plan, status, settings, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Coastal Crest Realty Demo',
  'Coastal Crest Realty LLC',
  'demo.crestdesk.com',
  'professional',
  'active',
  '{"timezone": "America/Los_Angeles", "defaultState": "OR", "brokerageLicense": "OR-2024-DEMO"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  company_name = EXCLUDED.company_name,
  updated_at = NOW();

-- Demo Users (password: Demo1234! — argon2 hash)
-- Managing Broker
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'broker@demo.crestdesk.com',
  'Sarah',
  'Mitchell',
  'managing_broker',
  'active',
  '$argon2id$v=19$m=65536,t=3,p=4$demo_salt_do_not_use_in_prod$hashed',
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
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'alex@demo.crestdesk.com',
  'Alex',
  'Rivera',
  'agent',
  'active',
  '$argon2id$v=19$m=65536,t=3,p=4$demo_salt_do_not_use_in_prod$hashed',
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
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'jordan@demo.crestdesk.com',
  'Jordan',
  'Chen',
  'agent',
  'active',
  '$argon2id$v=19$m=65536,t=3,p=4$demo_salt_do_not_use_in_prod$hashed',
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
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, licensed_states, license_numbers, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'maya@demo.crestdesk.com',
  'Maya',
  'Patel',
  'agent',
  'active',
  '$argon2id$v=19$m=65536,t=3,p=4$demo_salt_do_not_use_in_prod$hashed',
  ARRAY['OR'],
  '{"OR": "OR-202400004"}',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Staff member
INSERT INTO users (id, tenant_id, email, first_name, last_name, role, status, password_hash, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'office@demo.crestdesk.com',
  'Taylor',
  'Williams',
  'staff',
  'active',
  '$argon2id$v=19$m=65536,t=3,p=4$demo_salt_do_not_use_in_prod$hashed',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- Demo Contacts
INSERT INTO contacts (id, tenant_id, owner_id, first_name, last_name, email, phone, contact_type, source, status, mailing_address, tags, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Robert', 'Johnson', 'robert.j@example.com', '(503) 555-0101', 'buyer', 'referral', 'active',
   '{"street": "1234 NE Broadway", "city": "Portland", "state": "OR", "zip": "97232"}',
   ARRAY['first-time-buyer', 'pre-approved'], NOW()),

  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Lisa', 'Nguyen', 'lisa.n@example.com', '(503) 555-0102', 'seller', 'website', 'active',
   '{"street": "5678 SE Hawthorne", "city": "Portland", "state": "OR", "zip": "97214"}',
   ARRAY['downsizing', 'motivated'], NOW()),

  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'Michael', 'Thompson', 'michael.t@example.com', '(360) 555-0103', 'buyer', 'open_house', 'active',
   '{"street": "910 Main St", "city": "Vancouver", "state": "WA", "zip": "98660"}',
   ARRAY['investor', 'cash-buyer'], NOW()),

  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'Emily', 'Davis', 'emily.d@example.com', '(503) 555-0104', 'seller', 'past_client', 'active',
   '{"street": "2468 NW 23rd Ave", "city": "Portland", "state": "OR", "zip": "97210"}',
   ARRAY['luxury', 'relocation'], NOW()),

  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'David', 'Wilson', 'david.w@example.com', '(503) 555-0105', 'both', 'referral', 'active',
   '{"street": "1357 SE Division", "city": "Portland", "state": "OR", "zip": "97202"}',
   ARRAY['move-up-buyer'], NOW()),

  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'Jennifer', 'Martinez', 'jennifer.m@example.com', '(971) 555-0106', 'buyer', 'social_media', 'lead',
   '{"street": "864 N Mississippi Ave", "city": "Portland", "state": "OR", "zip": "97227"}',
   ARRAY['condo-buyer', 'first-time-buyer'], NOW()),

  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'James', 'Anderson', 'james.a@example.com', '(503) 555-0107', 'vendor', 'direct', 'active',
   '{"street": "111 SW 5th Ave", "city": "Portland", "state": "OR", "zip": "97204"}',
   ARRAY['inspector', 'preferred-vendor'], NOW()),

  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Patricia', 'Brown', 'patricia.b@example.com', '(503) 555-0108', 'vendor', 'direct', 'active',
   '{"street": "222 NW Everett St", "city": "Portland", "state": "OR", "zip": "97209"}',
   ARRAY['title-company', 'preferred-vendor'], NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Transactions
INSERT INTO transactions (id, tenant_id, agent_id, transaction_type, status, property_address, property_city, property_state, property_zip, price, commission_rate, notes, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'buy', 'active', '4521 NE Glisan St', 'Portland', 'OR', '97213', 525000.00, 2.5,
   'First-time buyer, FHA financing. Pre-approved with ABC Mortgage.', NOW()),

  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'sell', 'pending', '5678 SE Hawthorne Blvd', 'Portland', 'OR', '97214', 685000.00, 3.0,
   'Listing for Lisa Nguyen. Downsizing to a condo. Staged and ready.', NOW()),

  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'buy', 'active', '910 Main St Unit 4B', 'Vancouver', 'WA', '98660', 380000.00, 2.5,
   'Investment property. Cash offer expected. Client is investor.', NOW()),

  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012',
   'sell', 'active', '2468 NW 23rd Ave', 'Portland', 'OR', '97210', 1250000.00, 2.0,
   'Luxury property. Relocating out of state. Full marketing package.', NOW()),

  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'buy', 'pending', '1357 SE Division St', 'Portland', 'OR', '97202', 475000.00, 2.5,
   'Move-up buyer. Selling current home simultaneously.', NOW()),

  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013',
   'sell', 'closed', '7890 N Lombard St', 'Portland', 'OR', '97203', 415000.00, 3.0,
   'Closed successfully. Buyer waived inspection.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Pipeline Stages
INSERT INTO pipeline_stages (id, tenant_id, name, "order", color, is_default, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'New Lead', 1, '#6366f1', true, NOW()),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'Contacted', 2, '#8b5cf6', false, NOW()),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 'Qualified', 3, '#a855f7', false, NOW()),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', 'Showing Properties', 4, '#d946ef', false, NOW()),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000001', 'Offer Made', 5, '#ec4899', false, NOW()),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000001', 'Under Contract', 6, '#f43f5e', false, NOW()),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000001', 'Closed', 7, '#10b981', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Deals in pipeline
INSERT INTO deals (id, tenant_id, contact_id, stage_id, title, value, probability, assigned_to, notes, created_at)
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
   'First-time buyer from social media lead. Needs pre-approval.', NOW()),

  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000306',
   'Emily Davis - NW Portland Listing', 1250000.00, 90, '00000000-0000-0000-0000-000000000012',
   'Under contract. Buyer financing contingency expires next week.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Demo Commission Structures
INSERT INTO commission_structures (id, tenant_id, name, structure_type, tiers, effective_from, is_default, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001',
   'Standard Split', 'tiered',
   '[{"min": 0, "max": 3000000, "rate": 70}, {"min": 3000000, "max": null, "rate": 80}]',
   '2024-01-01', true, NOW()),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000001',
   'New Agent Split', 'flat',
   '[{"min": 0, "max": null, "rate": 60}]',
   '2024-01-01', false, NOW())
ON CONFLICT (id) DO NOTHING;
