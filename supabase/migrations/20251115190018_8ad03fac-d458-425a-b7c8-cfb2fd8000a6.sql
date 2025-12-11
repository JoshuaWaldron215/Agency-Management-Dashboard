-- Fix sheet visibility to use user_id instead of name
-- This allows admins to use nicknames without breaking chatter access

-- Drop old policy that checks chatter_name
DROP POLICY IF EXISTS "Chatters can view sheets matching their name" ON chatter_sheets;

-- Create new policy using chatter_user_id for proper authentication
CREATE POLICY "Chatters can view own sheets"
ON chatter_sheets
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR chatter_user_id = auth.uid()
);