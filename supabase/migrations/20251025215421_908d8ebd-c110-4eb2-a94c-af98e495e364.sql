-- Add timezone to chatter_sheets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chatter_sheets' 
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.chatter_sheets ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';
  END IF;
END $$;