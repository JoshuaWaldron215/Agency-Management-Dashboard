-- Create table for tracking daily hours worked
CREATE TABLE IF NOT EXISTS public.chatter_daily_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.chatter_sheets(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sheet_id, work_date)
);

-- Enable RLS
ALTER TABLE public.chatter_daily_hours ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can insert daily hours"
ON public.chatter_daily_hours
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update daily hours"
ON public.chatter_daily_hours
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete daily hours"
ON public.chatter_daily_hours
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view hours for accessible sheets
CREATE POLICY "Users can view daily hours for accessible sheets"
ON public.chatter_daily_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chatter_sheets cs
    WHERE cs.id = chatter_daily_hours.sheet_id
    AND (
      cs.chatter_name = (SELECT name FROM public.profiles WHERE id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_chatter_daily_hours_updated_at
BEFORE UPDATE ON public.chatter_daily_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();