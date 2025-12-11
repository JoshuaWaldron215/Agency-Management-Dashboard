-- =====================================================
-- MAP MGT - Production Setup Script
-- Run this AFTER supabase_migration.sql and supabase_auth_fix.sql
-- =====================================================

-- =====================================================
-- STEP 1: CREATE INITIAL TEAMS
-- =====================================================

INSERT INTO teams (name, color_hex) VALUES
  ('Green Team', '#22c55e'),
  ('Blue Team', '#3b82f6'),
  ('Orange Team', '#f97316'),
  ('Purple Team', '#a855f7'),
  ('White Team', '#f1f5f9'),
  ('Red Team', '#ef4444'),
  ('Black Team', '#1e293b'),
  ('Yellow Team', '#eab308'),
  ('Brown Team', '#78350f')
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: PROMOTE FIRST USER TO ADMIN
-- Run this after you create your first account!
-- Replace 'your-email@example.com' with YOUR email
-- =====================================================

-- Option 1: Promote by email
-- UPDATE user_roles 
-- SET role = 'admin' 
-- WHERE user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com');

-- Option 2: Promote first registered user to admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- =====================================================
-- STEP 3: VERIFY THE SETUP
-- =====================================================

-- Check teams were created
SELECT id, name, color_hex FROM teams;

-- Check admin user was set
SELECT 
  p.email, 
  p.name, 
  ur.role 
FROM profiles p 
JOIN user_roles ur ON p.id = ur.user_id 
WHERE ur.role = 'admin';

-- =====================================================
-- OPTIONAL: Create sample models for testing
-- =====================================================

-- INSERT INTO models (name, image_url) VALUES
--   ('Model One', NULL),
--   ('Model Two', NULL),
--   ('Model Three', NULL);

-- =====================================================
-- DONE! Your first admin user is ready.
-- =====================================================
