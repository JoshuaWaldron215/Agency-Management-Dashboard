-- Allow chatters to create their own sheets
-- Run this in Supabase SQL Editor

-- First, drop the existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own sheets" ON chatter_sheets;

-- Create a new policy that allows users to insert their own sheets
CREATE POLICY "Users can insert their own sheets"
ON chatter_sheets
FOR INSERT
TO authenticated
WITH CHECK (
  chatter_user_id = auth.uid()
);

-- Also ensure users can update their own sheets
DROP POLICY IF EXISTS "Users can update their own sheets" ON chatter_sheets;

CREATE POLICY "Users can update their own sheets"
ON chatter_sheets
FOR UPDATE
TO authenticated
USING (chatter_user_id = auth.uid())
WITH CHECK (chatter_user_id = auth.uid());
