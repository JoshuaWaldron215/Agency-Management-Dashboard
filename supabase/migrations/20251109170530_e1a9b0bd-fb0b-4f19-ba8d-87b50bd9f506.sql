-- Drop existing chatter view policies
DROP POLICY IF EXISTS "Chatters can view own sheets" ON public.chatter_sheets;
DROP POLICY IF EXISTS "Chatters can view own sheets by user id" ON public.chatter_sheets;

-- Create new policy for chatters to view only their own sheets by name
CREATE POLICY "Chatters can view sheets matching their name"
ON public.chatter_sheets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  chatter_name = (SELECT name FROM public.profiles WHERE id = auth.uid())
);

-- Ensure only admins can update chatter_sheets
DROP POLICY IF EXISTS "Admins can update sheets" ON public.chatter_sheets;
CREATE POLICY "Admins can update sheets"
ON public.chatter_sheets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure only admins can insert
DROP POLICY IF EXISTS "Admins can insert sheets" ON public.chatter_sheets;
CREATE POLICY "Admins can insert sheets"
ON public.chatter_sheets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure only admins can delete
DROP POLICY IF EXISTS "Admins can delete sheets" ON public.chatter_sheets;
CREATE POLICY "Admins can delete sheets"
ON public.chatter_sheets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also update the admins view policy to be combined with chatter policy
DROP POLICY IF EXISTS "Admins can view all sheets" ON public.chatter_sheets;