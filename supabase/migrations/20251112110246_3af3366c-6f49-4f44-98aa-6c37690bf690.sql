-- Add team_id to profiles table to associate users with teams
ALTER TABLE public.profiles
ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Create index for better query performance
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);