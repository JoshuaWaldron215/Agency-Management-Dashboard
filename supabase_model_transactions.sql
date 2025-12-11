-- Run this in Supabase Dashboard > SQL Editor
-- Creates the model_transactions table to store parsed earnings data per model

-- Create the model_transactions table
CREATE TABLE IF NOT EXISTS public.model_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  chatter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  gross DECIMAL(10,2) NOT NULL,
  net DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_model_transactions_model_id ON public.model_transactions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_transactions_chatter_id ON public.model_transactions(chatter_id);
CREATE INDEX IF NOT EXISTS idx_model_transactions_date ON public.model_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_model_transactions_category ON public.model_transactions(category);

-- Enable RLS
ALTER TABLE public.model_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all model_transactions"
ON public.model_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Chatters can insert their own transactions
CREATE POLICY "Chatters can insert own transactions"
ON public.model_transactions
FOR INSERT
TO authenticated
WITH CHECK (chatter_id = auth.uid());

-- Chatters can view their own transactions
CREATE POLICY "Chatters can view own transactions"
ON public.model_transactions
FOR SELECT
TO authenticated
USING (chatter_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.model_transactions TO authenticated;
GRANT ALL ON public.model_transactions TO service_role;
