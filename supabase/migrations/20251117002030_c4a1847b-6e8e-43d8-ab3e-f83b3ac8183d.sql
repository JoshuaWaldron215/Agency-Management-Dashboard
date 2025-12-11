-- Add week_start_date column for infinite sheets (Saturday-Friday cycles)
ALTER TABLE chatter_sheets ADD COLUMN week_start_date DATE;

-- Populate week_start_date from existing period_start (assuming period_start is the Saturday)
UPDATE chatter_sheets SET week_start_date = period_start;

-- Make week_start_date NOT NULL after populating
ALTER TABLE chatter_sheets ALTER COLUMN week_start_date SET NOT NULL;

-- Make old columns nullable (keep for historical reference but stop using them)
ALTER TABLE chatter_sheets ALTER COLUMN period_start DROP NOT NULL;
ALTER TABLE chatter_sheets ALTER COLUMN period_end DROP NOT NULL;