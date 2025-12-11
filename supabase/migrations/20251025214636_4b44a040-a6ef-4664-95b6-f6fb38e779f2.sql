-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can insert chatter details" ON public.chatter_details;
  DROP POLICY IF EXISTS "Admins can update chatter details" ON public.chatter_details;
END $$;

-- Allow admins to insert chatter details records
CREATE POLICY "Admins can insert chatter details"
ON public.chatter_details
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update chatter details
CREATE POLICY "Admins can update chatter details"
ON public.chatter_details
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));