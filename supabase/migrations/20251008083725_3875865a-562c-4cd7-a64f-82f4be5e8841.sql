-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create teams table with fixed color-coded teams
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color_hex TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule_weeks table
CREATE TABLE public.schedule_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, week_start_date)
);

-- Create shift_slots table
CREATE TABLE public.shift_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  label TEXT NOT NULL,
  start_local TEXT NOT NULL,
  end_local TEXT NOT NULL,
  assigned TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_notes_length CHECK (char_length(notes) <= 200)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams (everyone can view)
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT USING (true);

-- RLS Policies for schedule_weeks
CREATE POLICY "Anyone can view schedule weeks"
ON public.schedule_weeks FOR SELECT USING (true);

CREATE POLICY "Managers can create schedule weeks"
ON public.schedule_weeks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('MANAGER', 'OWNER')
  )
);

CREATE POLICY "Managers can update schedule weeks"
ON public.schedule_weeks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('MANAGER', 'OWNER')
  )
);

-- RLS Policies for shift_slots
CREATE POLICY "Anyone can view shift slots"
ON public.shift_slots FOR SELECT USING (true);

CREATE POLICY "Managers can create shift slots"
ON public.shift_slots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('MANAGER', 'OWNER')
  )
);

CREATE POLICY "Managers can update shift slots"
ON public.shift_slots FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('MANAGER', 'OWNER')
  )
);

CREATE POLICY "Managers can delete shift slots"
ON public.shift_slots FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('MANAGER', 'OWNER')
  )
);

-- Seed the nine fixed teams
INSERT INTO public.teams (name, color_hex) VALUES
  ('Green Team', '#2ecc71'),
  ('Blue Team', '#3498db'),
  ('Orange Team', '#e67e22'),
  ('Purple Team', '#9b59b6'),
  ('White Team', '#d1d5db'),
  ('Red Team', '#e74c3c'),
  ('Black Team', '#111827'),
  ('Yellow Team', '#f1c40f'),
  ('Brown Team', '#8e5a33');

-- Add updated_at triggers
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_weeks_updated_at
BEFORE UPDATE ON public.schedule_weeks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_slots_updated_at
BEFORE UPDATE ON public.shift_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();