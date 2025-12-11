-- =====================================================
-- MAP MGT - COMPLETE SUPABASE SETUP SCRIPT
-- Run this entire script in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- =====================================================

-- =====================================================
-- PART 1: AUTH FIX (Required for signup to work)
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chatter_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, name, dob)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, '2000-01-01'::DATE)
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'chatter')
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.chatter_details (user_id, pay_class, start_date)
  VALUES (NEW.id, 'standard', CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO _chatter_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert user_roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can insert chatter_details" ON chatter_details;

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert user_roles" ON user_roles
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert chatter_details" ON chatter_details
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =====================================================
-- PART 2: CHATTER SHEET POLICIES (Required for Save to Sheet)
-- =====================================================

DROP POLICY IF EXISTS "Users can insert their own sheets" ON chatter_sheets;
CREATE POLICY "Users can insert their own sheets"
ON chatter_sheets
FOR INSERT
TO authenticated
WITH CHECK (chatter_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sheets" ON chatter_sheets;
CREATE POLICY "Users can update their own sheets"
ON chatter_sheets
FOR UPDATE
TO authenticated
USING (chatter_user_id = auth.uid())
WITH CHECK (chatter_user_id = auth.uid());

-- =====================================================
-- PART 3: ADMIN PROFILE FIX (Required for team assignments)
-- =====================================================

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (has_role('admin', auth.uid()))
  WITH CHECK (has_role('admin', auth.uid()));

-- =====================================================
-- PART 4: CREATE DEFAULT TEAMS
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
-- PART 5: PROMOTE FIRST USER TO ADMIN
-- =====================================================

UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- =====================================================
-- VERIFICATION QUERIES (Check these after running)
-- =====================================================

SELECT '--- TEAMS ---' as section;
SELECT id, name, color_hex FROM teams;

SELECT '--- ADMIN USERS ---' as section;
SELECT p.email, p.name, ur.role 
FROM profiles p 
JOIN user_roles ur ON p.id = ur.user_id 
WHERE ur.role = 'admin';

SELECT '--- ALL USERS ---' as section;
SELECT p.email, p.name, ur.role 
FROM profiles p 
JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at;

SELECT '--- MODELS (including soft-deleted) ---' as section;
SELECT name, deleted_at, 
  CASE WHEN deleted_at IS NULL THEN 'ACTIVE' ELSE 'DELETED' END as status
FROM models
ORDER BY deleted_at NULLS FIRST, name;

-- =====================================================
-- DONE! Your Supabase is fully configured.
-- =====================================================
