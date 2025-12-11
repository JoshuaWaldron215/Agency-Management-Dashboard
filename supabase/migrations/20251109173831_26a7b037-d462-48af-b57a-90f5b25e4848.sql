-- Allow chatters to insert sales for their own sheets
CREATE POLICY "Chatters can insert sales for own sheets"
ON public.chatter_sheet_daily_sales
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    INNER JOIN profiles p ON p.name = cs.chatter_name
    WHERE cs.id = chatter_sheet_daily_sales.sheet_id
      AND p.id = auth.uid()
  )
);