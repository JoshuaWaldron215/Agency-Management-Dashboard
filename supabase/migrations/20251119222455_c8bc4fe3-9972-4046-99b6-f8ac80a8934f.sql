-- Drop the existing incomplete UPDATE policy for chatters
DROP POLICY IF EXISTS "Chatters can update sales for own sheets" ON chatter_sheet_daily_sales;

-- Recreate with both USING and WITH CHECK clauses
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
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_sheet_daily_sales.sheet_id 
      AND cs.chatter_user_id = auth.uid()
  )
);