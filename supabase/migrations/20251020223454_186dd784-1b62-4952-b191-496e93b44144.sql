-- Add admin-only policies for managing pay records
-- These ensure only users with 'admin' role can insert, update, or delete salary information

CREATE POLICY "Admins can insert pay records"
ON public.pay_records
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pay records"
ON public.pay_records
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pay records"
ON public.pay_records
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Optional: Add admin policy to view all pay records for management purposes
CREATE POLICY "Admins can view all pay records"
ON public.pay_records
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));