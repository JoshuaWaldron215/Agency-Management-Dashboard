-- First, remove the role column from profiles table to fix security issue
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update any existing 'manager' roles to 'admin'
UPDATE public.user_roles SET role = 'admin' WHERE role = 'manager';

-- We need to use a simpler approach: just add the new values to the enum
-- Since we already have admin and chatter, we just need to ensure consistency
-- The enum already exists with admin, manager, chatter

-- Add policy for admins to view all users' profiles
DROP POLICY IF EXISTS "Admins can view all users" ON public.profiles;
CREATE POLICY "Admins can view all users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);