-- Fix all scheduling-related security issues

-- 1. DROP the public access policy on shift_slots
DROP POLICY IF EXISTS "Anyone can view shift slots" ON public.shift_slots;

-- 2. ADD authenticated-only view policy for shift_slots
CREATE POLICY "Authenticated users can view shift slots"
ON public.shift_slots
FOR SELECT
TO authenticated
USING (true);

-- 3. DROP the overly permissive policies on shift_slots
DROP POLICY IF EXISTS "All authenticated can create shift slots" ON public.shift_slots;
DROP POLICY IF EXISTS "All authenticated can update shift slots" ON public.shift_slots;
DROP POLICY IF EXISTS "All authenticated can delete shift slots" ON public.shift_slots;

-- 4. ADD admin-only policies for shift_slots management
CREATE POLICY "Admins can insert shift slots"
ON public.shift_slots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shift slots"
ON public.shift_slots
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete shift slots"
ON public.shift_slots
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. DROP overly permissive policies on schedule_weeks
DROP POLICY IF EXISTS "All authenticated can create schedule weeks" ON public.schedule_weeks;
DROP POLICY IF EXISTS "All authenticated can update schedule weeks" ON public.schedule_weeks;

-- 6. ADD admin-only policies for schedule_weeks management
CREATE POLICY "Admins can insert schedule weeks"
ON public.schedule_weeks
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update schedule weeks"
ON public.schedule_weeks
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Keep the view policy for schedule_weeks (already exists and is fine)
-- "Anyone can view schedule weeks" - this is okay as it's just week metadata