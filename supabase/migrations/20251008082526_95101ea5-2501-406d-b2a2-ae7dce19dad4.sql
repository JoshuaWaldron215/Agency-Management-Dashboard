-- Create enum types for time off
CREATE TYPE public.time_off_type AS ENUM ('SICK', 'PERSONAL', 'VACATION', 'OTHER');
CREATE TYPE public.time_off_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELED');

-- Create time_off_requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.time_off_type NOT NULL DEFAULT 'PERSONAL',
  status public.time_off_status NOT NULL DEFAULT 'PENDING',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

-- Enable Row Level Security
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own time off requests" 
ON public.time_off_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own time off requests" 
ON public.time_off_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own PENDING requests
CREATE POLICY "Users can update own pending requests" 
ON public.time_off_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'PENDING');

-- Users can delete their own PENDING requests
CREATE POLICY "Users can delete own pending requests" 
ON public.time_off_requests 
FOR DELETE 
USING (auth.uid() = user_id AND status = 'PENDING');