-- Add assigned_models column to schedule_weeks table to store model IDs assigned to this team week
ALTER TABLE public.schedule_weeks 
ADD COLUMN assigned_models text[] DEFAULT ARRAY[]::text[];