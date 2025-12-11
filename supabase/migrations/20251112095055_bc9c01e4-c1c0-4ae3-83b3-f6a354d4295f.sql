-- Add foreign key constraint with cascade delete for model_id in chatter_sheet_daily_sales
-- This ensures when a model is deleted, all related sales records are automatically removed

ALTER TABLE chatter_sheet_daily_sales
DROP CONSTRAINT IF EXISTS chatter_sheet_daily_sales_model_id_fkey;

ALTER TABLE chatter_sheet_daily_sales
ADD CONSTRAINT chatter_sheet_daily_sales_model_id_fkey
FOREIGN KEY (model_id) 
REFERENCES models(id) 
ON DELETE CASCADE;