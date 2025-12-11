-- Add deleted_at column to models table for soft delete
ALTER TABLE models ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Drop existing CASCADE foreign key
ALTER TABLE chatter_sheet_daily_sales 
  DROP CONSTRAINT chatter_sheet_daily_sales_model_id_fkey;

-- Add new RESTRICT foreign key (prevents hard deletion if sales exist)
ALTER TABLE chatter_sheet_daily_sales
  ADD CONSTRAINT chatter_sheet_daily_sales_model_id_fkey 
  FOREIGN KEY (model_id) 
  REFERENCES models(id) 
  ON DELETE RESTRICT;

-- Add index for better query performance on active models
CREATE INDEX idx_models_deleted_at ON models(deleted_at) 
  WHERE deleted_at IS NULL;

-- Update audit trigger to log soft deletes as ARCHIVE
CREATE OR REPLACE FUNCTION public.audit_models_changes()
RETURNS TRIGGER AS $$
DECLARE
  _actor_name TEXT;
BEGIN
  SELECT name INTO _actor_name FROM public.profiles WHERE id = auth.uid();
  IF _actor_name IS NULL THEN _actor_name := 'System'; END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'CREATE', 'MODEL', NEW.id, NEW.name, jsonb_build_object('model_name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete (deleted_at changed from NULL to a value)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
      VALUES (auth.uid(), _actor_name, 'DELETE', 'MODEL', NEW.id, NEW.name, 
              jsonb_build_object('archived', true, 'model_name', NEW.name, 'deleted_at', NEW.deleted_at));
    ELSE
      INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
      VALUES (auth.uid(), _actor_name, 'UPDATE', 'MODEL', NEW.id, NEW.name, 
              jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, actor_name, action_type, resource_type, resource_id, resource_name, details)
    VALUES (auth.uid(), _actor_name, 'DELETE', 'MODEL', OLD.id, OLD.name, jsonb_build_object('model_name', OLD.name));
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;