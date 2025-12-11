-- Add chatter_user_id to chatter_sheets and policy for user visibility
ALTER TABLE public.chatter_sheets ADD COLUMN IF NOT EXISTS chatter_user_id uuid;

-- Allow chatters to view their own sheets via user id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chatter_sheets' AND policyname='Chatters can view own sheets by user id'
  ) THEN
    CREATE POLICY "Chatters can view own sheets by user id"
    ON public.chatter_sheets
    FOR SELECT
    USING (chatter_user_id = auth.uid());
  END IF;
END $$;

-- Optional: index for performance
CREATE INDEX IF NOT EXISTS idx_chatter_sheets_user ON public.chatter_sheets (chatter_user_id);
