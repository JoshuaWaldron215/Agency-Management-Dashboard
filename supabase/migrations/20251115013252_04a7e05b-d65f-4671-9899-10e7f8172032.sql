-- Create ENUM types for audit log
CREATE TYPE public.audit_action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');
CREATE TYPE public.audit_resource_type AS ENUM ('USER', 'MODEL', 'SHEET', 'ROLE', 'TEAM', 'SCHEDULE', 'SALES', 'HOURS', 'TIME_OFF', 'ACCOUNT');

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action_type audit_action_type NOT NULL,
  resource_type audit_resource_type NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- No one can update or delete audit logs (append-only)
-- Only system/backend can insert

-- Create indexes for performance
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_id ON public.audit_logs(resource_id);

-- Helper function for logging (called from application)
CREATE OR REPLACE FUNCTION public.log_audit(
  _action_type audit_action_type,
  _resource_type audit_resource_type,
  _resource_id UUID DEFAULT NULL,
  _resource_name TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id UUID;
  _actor_name TEXT;
  _log_id UUID;
BEGIN
  -- Get current user
  _actor_id := auth.uid();
  
  -- Get actor name from profiles
  SELECT name INTO _actor_name
  FROM public.profiles
  WHERE id = _actor_id;
  
  -- If no name found, use 'System'
  IF _actor_name IS NULL THEN
    _actor_name := 'System';
  END IF;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    action_type,
    resource_type,
    resource_id,
    resource_name,
    details
  )
  VALUES (
    _actor_id,
    _actor_name,
    _action_type,
    _resource_type,
    _resource_id,
    _resource_name,
    _details
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Create triggers for automatic logging

-- Trigger for user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_name TEXT;
  _resource_name TEXT;
BEGIN
  -- Get actor name
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  IF _actor_name IS NULL THEN _actor_name := 'System'; END IF;
  
  -- Get resource (affected user) name
  SELECT name INTO _resource_name FROM public.profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'CREATE', 'ROLE', NEW.user_id, _resource_name, jsonb_build_object('role', NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'UPDATE', 'ROLE', NEW.user_id, _resource_name, 
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'DELETE', 'ROLE', OLD.user_id, _resource_name, jsonb_build_object('role', OLD.role));
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

-- Trigger for models changes
CREATE OR REPLACE FUNCTION public.audit_models_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_name TEXT;
BEGIN
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  IF _actor_name IS NULL THEN _actor_name := 'System'; END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'CREATE', 'MODEL', NEW.id, NEW.name, jsonb_build_object('model_name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'UPDATE', 'MODEL', NEW.id, NEW.name, 
            jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'DELETE', 'MODEL', OLD.id, OLD.name, jsonb_build_object('model_name', OLD.name));
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_models_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.audit_models_changes();

-- Trigger for chatter_sheets changes
CREATE OR REPLACE FUNCTION public.audit_sheets_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_name TEXT;
BEGIN
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  IF _actor_name IS NULL THEN _actor_name := 'System'; END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'CREATE', 'SHEET', NEW.id, NEW.chatter_name, 
            jsonb_build_object('chatter_name', NEW.chatter_name, 'period_start', NEW.period_start, 'period_end', NEW.period_end));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'UPDATE', 'SHEET', NEW.id, NEW.chatter_name, 
            jsonb_build_object(
              'changed_fields', jsonb_build_object(
                'commission_rate', CASE WHEN OLD.commission_rate != NEW.commission_rate THEN jsonb_build_object('old', OLD.commission_rate, 'new', NEW.commission_rate) ELSE NULL END,
                'hourly_rate', CASE WHEN OLD.hourly_rate != NEW.hourly_rate THEN jsonb_build_object('old', OLD.hourly_rate, 'new', NEW.hourly_rate) ELSE NULL END,
                'bonus', CASE WHEN OLD.bonus != NEW.bonus THEN jsonb_build_object('old', OLD.bonus, 'new', NEW.bonus) ELSE NULL END,
                'total_hours', CASE WHEN OLD.total_hours != NEW.total_hours THEN jsonb_build_object('old', OLD.total_hours, 'new', NEW.total_hours) ELSE NULL END
              )
            ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'DELETE', 'SHEET', OLD.id, OLD.chatter_name, 
            jsonb_build_object('chatter_name', OLD.chatter_name));
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_sheets_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.chatter_sheets
FOR EACH ROW EXECUTE FUNCTION public.audit_sheets_changes();

-- Trigger for profiles team changes
CREATE OR REPLACE FUNCTION public.audit_profile_team_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_name TEXT;
  _old_team_name TEXT;
  _new_team_name TEXT;
BEGIN
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  IF _actor_name IS NULL THEN _actor_name := 'System'; END IF;
  
  IF TG_OP = 'UPDATE' AND (OLD.team_id IS DISTINCT FROM NEW.team_id) THEN
    -- Get team names
    SELECT name INTO _old_team_name FROM public.teams WHERE id = OLD.team_id;
    SELECT name INTO _new_team_name FROM public.teams WHERE id = NEW.team_id;
    
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'UPDATE', 'TEAM', NEW.id, NEW.name, 
            jsonb_build_object('old_team', _old_team_name, 'new_team', _new_team_name));
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_profile_team_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_team_changes();