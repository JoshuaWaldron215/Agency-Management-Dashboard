-- Create models table for storing model names
CREATE TABLE public.models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Everyone can view models
CREATE POLICY "Anyone can view models"
ON public.models
FOR SELECT
USING (true);

-- Only admins can insert models
CREATE POLICY "Admins can insert models"
ON public.models
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update models
CREATE POLICY "Admins can update models"
ON public.models
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete models
CREATE POLICY "Admins can delete models"
ON public.models
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_models_updated_at
BEFORE UPDATE ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();