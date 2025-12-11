-- Update RLS policies for schedule_weeks to allow all authenticated users
DROP POLICY IF EXISTS "Managers can create schedule weeks" ON schedule_weeks;
DROP POLICY IF EXISTS "Managers can update schedule weeks" ON schedule_weeks;

CREATE POLICY "Authenticated users can create schedule weeks" 
ON schedule_weeks 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule weeks" 
ON schedule_weeks 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS policies for shift_slots to allow all authenticated users
DROP POLICY IF EXISTS "Managers can create shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Managers can update shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Managers can delete shift slots" ON shift_slots;

CREATE POLICY "Authenticated users can create shift slots" 
ON shift_slots 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift slots" 
ON shift_slots 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shift slots" 
ON shift_slots 
FOR DELETE 
TO authenticated
USING (true);