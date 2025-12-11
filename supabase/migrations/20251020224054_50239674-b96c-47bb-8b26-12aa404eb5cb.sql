-- Fix public data exposure issues

-- 1. Require authentication for teams table
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;

CREATE POLICY "Authenticated users can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

-- 2. Require authentication for models table
DROP POLICY IF EXISTS "Anyone can view models" ON public.models;

CREATE POLICY "Authenticated users can view models"
ON public.models
FOR SELECT
TO authenticated
USING (true);

-- 3. Require authentication for schedule_weeks table
DROP POLICY IF EXISTS "Anyone can view schedule weeks" ON public.schedule_weeks;

CREATE POLICY "Authenticated users can view schedule weeks"
ON public.schedule_weeks
FOR SELECT
TO authenticated
USING (true);