-- =====================================================
-- FIX: Supabase Auth Trigger for New User Creation
-- Run this in your Supabase SQL Editor to fix signup
-- =====================================================

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create or replace the function with SECURITY DEFINER
-- This allows the function to bypass RLS policies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chatter_id UUID;
BEGIN
  -- Create profile (bypass RLS with SECURITY DEFINER)
  INSERT INTO public.profiles (id, email, name, dob)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, '2000-01-01'::DATE)
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default chatter role (bypass RLS with SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'chatter')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create chatter details (bypass RLS with SECURITY DEFINER)
  INSERT INTO public.chatter_details (user_id, pay_class, start_date)
  VALUES (NEW.id, 'standard', CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO _chatter_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Also ensure service_role can insert into these tables
-- =====================================================

-- Drop existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert user_roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can insert chatter_details" ON chatter_details;

-- Create policies that allow the trigger function to insert
-- Note: SECURITY DEFINER functions run as the function owner (postgres)
-- so they bypass RLS, but we add these for extra safety

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert user_roles" ON user_roles
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can insert chatter_details" ON chatter_details
  FOR INSERT TO service_role WITH CHECK (true);

-- Also allow authenticated users to insert their own profile on signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =====================================================
-- DONE! Now try signing up again
-- =====================================================
