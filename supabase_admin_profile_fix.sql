-- =====================================================
-- FIX: Allow admins to update other users' profiles
-- Run this in your Supabase SQL Editor
-- =====================================================
-- Note: This assumes the has_role() function already exists from the main migration.
-- If you get an error about has_role not existing, run supabase_migration.sql first.

-- Add policy for admins to update any profile (for team assignments)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (has_role('admin', auth.uid()))
  WITH CHECK (has_role('admin', auth.uid()));

-- =====================================================
-- DONE! Admins can now update team assignments
-- =====================================================
