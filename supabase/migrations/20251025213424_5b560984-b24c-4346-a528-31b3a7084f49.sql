-- Create chatter sheets table
CREATE TABLE public.chatter_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatter_id uuid NOT NULL REFERENCES public.chatter_details(id) ON DELETE CASCADE,
  chatter_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 1.0,
  hourly_rate numeric NOT NULL DEFAULT 3.00,
  total_hours numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create chatter sheet accounts table
CREATE TABLE public.chatter_sheet_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id uuid NOT NULL REFERENCES public.chatter_sheets(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  sales_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatter_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatter_sheet_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for chatter_sheets
CREATE POLICY "Chatters can view own sheets"
ON public.chatter_sheets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chatter_details
    WHERE chatter_details.id = chatter_sheets.chatter_id
    AND chatter_details.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all sheets"
ON public.chatter_sheets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sheets"
ON public.chatter_sheets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sheets"
ON public.chatter_sheets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sheets"
ON public.chatter_sheets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for chatter_sheet_accounts
CREATE POLICY "Users can view accounts for accessible sheets"
ON public.chatter_sheet_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chatter_sheets cs
    LEFT JOIN public.chatter_details cd ON cd.id = cs.chatter_id
    WHERE cs.id = chatter_sheet_accounts.sheet_id
    AND (cd.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can insert accounts"
ON public.chatter_sheet_accounts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update accounts"
ON public.chatter_sheet_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete accounts"
ON public.chatter_sheet_accounts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));