-- Fix RLS policies for daily sales and hours to use user_id instead of name matching
-- This completes the transition from name-based to user_id-based access control

-- ========================================
-- chatter_sheet_daily_sales policies
-- ========================================

-- Drop old INSERT policy that checks name
DROP POLICY IF EXISTS "Chatters can insert sales for own sheets" ON chatter_sheet_daily_sales;

-- Create new INSERT policy using chatter_user_id
CREATE POLICY "Chatters can insert sales for own sheets"
ON chatter_sheet_daily_sales
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_sheet_daily_sales.sheet_id
      AND cs.chatter_user_id = auth.uid()
  )
);

-- ========================================
-- chatter_daily_hours policies
-- ========================================

-- Drop old INSERT policy that checks name
DROP POLICY IF EXISTS "Chatters can insert own daily hours" ON chatter_daily_hours;

-- Create new INSERT policy using chatter_user_id
CREATE POLICY "Chatters can insert own daily hours"
ON chatter_daily_hours
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_daily_hours.sheet_id
      AND cs.chatter_user_id = auth.uid()
  )
);

-- Drop old UPDATE policy that checks name
DROP POLICY IF EXISTS "Chatters can update own daily hours" ON chatter_daily_hours;

-- Create new UPDATE policy using chatter_user_id
CREATE POLICY "Chatters can update own daily hours"
ON chatter_daily_hours
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_daily_hours.sheet_id
      AND cs.chatter_user_id = auth.uid()
  )
);