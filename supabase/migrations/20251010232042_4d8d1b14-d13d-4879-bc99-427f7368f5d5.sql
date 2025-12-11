-- First drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can create schedule weeks" ON schedule_weeks;
DROP POLICY IF EXISTS "Authenticated users can update schedule weeks" ON schedule_weeks;
DROP POLICY IF EXISTS "Managers can create schedule weeks" ON schedule_weeks;
DROP POLICY IF EXISTS "Managers can update schedule weeks" ON schedule_weeks;

DROP POLICY IF EXISTS "Authenticated users can create shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Authenticated users can update shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Authenticated users can delete shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Managers can create shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Managers can update shift slots" ON shift_slots;
DROP POLICY IF EXISTS "Managers can delete shift slots" ON shift_slots;

-- Now create new policies that allow all authenticated users
CREATE POLICY "All authenticated can create schedule weeks" 
ON schedule_weeks 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated can update schedule weeks" 
ON schedule_weeks 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "All authenticated can create shift slots" 
ON shift_slots 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated can update shift slots" 
ON shift_slots 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "All authenticated can delete shift slots" 
ON shift_slots 
FOR DELETE 
TO authenticated
USING (true);