-- Add policy for admins to view all chatter details
CREATE POLICY "Admins can view all chatter details"
ON public.chatter_details
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));