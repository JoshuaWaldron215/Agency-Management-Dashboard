-- Run this in Supabase Dashboard > SQL Editor
-- This fixes the foreign key constraint that prevents user deletion

-- Step 1: Drop the foreign key that references auth.users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_status_updated_by_fkey;

-- Step 2: Re-add it with ON DELETE SET NULL (so deleting a user sets this to null)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_updated_by_fkey 
FOREIGN KEY (status_updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Also ensure the profile's own FK cascades properly
-- (This should already be set, but let's confirm)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;
