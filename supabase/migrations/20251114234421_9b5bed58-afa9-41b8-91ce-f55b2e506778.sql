-- Allow chatters to view their own daily hours
CREATE POLICY "Chatters can view own daily hours"
ON chatter_daily_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    JOIN profiles p ON p.name = cs.chatter_name
    WHERE cs.id = chatter_daily_hours.sheet_id
    AND p.id = auth.uid()
  )
);

-- Allow chatters to insert their own daily hours
CREATE POLICY "Chatters can insert own daily hours"
ON chatter_daily_hours
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    JOIN profiles p ON p.name = cs.chatter_name
    WHERE cs.id = sheet_id
    AND p.id = auth.uid()
  )
);

-- Allow chatters to update their own daily hours
CREATE POLICY "Chatters can update own daily hours"
ON chatter_daily_hours
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    JOIN profiles p ON p.name = cs.chatter_name
    WHERE cs.id = chatter_daily_hours.sheet_id
    AND p.id = auth.uid()
  )
);