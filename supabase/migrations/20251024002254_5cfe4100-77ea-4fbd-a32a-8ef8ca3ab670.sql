-- Backfill profiles for all existing users missing a profile
-- This reads from auth.users but does NOT modify auth schema
INSERT INTO public.profiles (id, name, email, dob, avatar_url)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE((u.raw_user_meta_data->>'dob')::date, CURRENT_DATE),
  NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;