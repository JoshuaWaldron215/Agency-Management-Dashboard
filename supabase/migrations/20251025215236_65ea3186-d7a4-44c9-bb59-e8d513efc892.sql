-- Create table for daily model sales
CREATE TABLE public.chatter_sheet_daily_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id uuid NOT NULL REFERENCES public.chatter_sheets(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  sale_date date NOT NULL,
  sales_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(sheet_id, model_id, sale_date)
);

-- Enable RLS
ALTER TABLE public.chatter_sheet_daily_sales ENABLE ROW LEVEL SECURITY;

-- Policies for daily sales
CREATE POLICY "Users can view daily sales for accessible sheets"
ON public.chatter_sheet_daily_sales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chatter_sheets cs
    WHERE cs.id = chatter_sheet_daily_sales.sheet_id
    AND (cs.chatter_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can insert daily sales"
ON public.chatter_sheet_daily_sales
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update daily sales"
ON public.chatter_sheet_daily_sales
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete daily sales"
ON public.chatter_sheet_daily_sales
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add timezone to chatter_sheets
ALTER TABLE public.chatter_sheets ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';

-- Trigger for updated_at
CREATE TRIGGER update_daily_sales_updated_at
BEFORE UPDATE ON public.chatter_sheet_daily_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();