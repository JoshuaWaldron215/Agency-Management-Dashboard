-- Fix SELECT RLS policies for chatter_daily_hours to use user_id instead of name matching
-- This completes the full transition to user_id-based access control

-- Drop old SELECT policy that joins on name
DROP POLICY IF EXISTS "Chatters can view own daily hours" ON chatter_daily_hours;

-- Create new SELECT policy using chatter_user_id
CREATE POLICY "Chatters can view own daily hours"
ON chatter_daily_hours
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_daily_hours.sheet_id
      AND cs.chatter_user_id = auth.uid()
  )
);

-- Drop old SELECT policy that checks name
DROP POLICY IF EXISTS "Users can view daily hours for accessible sheets" ON chatter_daily_hours;

-- Create new SELECT policy using chatter_user_id
CREATE POLICY "Users can view daily hours for accessible sheets"
ON chatter_daily_hours
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_daily_hours.sheet_id
      AND (cs.chatter_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);