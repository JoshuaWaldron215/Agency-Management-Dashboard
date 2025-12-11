-- Allow chatters to update their own daily sales
-- This completes the RLS policies for chatters to fully manage their sales data

CREATE POLICY "Chatters can update sales for own sheets"
ON chatter_sheet_daily_sales
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_sheet_daily_sales.sheet_id
      AND cs.chatter_user_id = auth.uid()
  )
);