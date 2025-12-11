-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  dob date NOT NULL,
  role text DEFAULT 'CHATTER' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create chatter_details table
CREATE TABLE public.chatter_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_username text,
  pay_class text NOT NULL,
  start_date date NOT NULL,
  fansmetric_email text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create pay_records table
CREATE TABLE public.pay_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id uuid NOT NULL REFERENCES public.chatter_details(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  year int NOT NULL CHECK (year >= 2020),
  shift_pay int NOT NULL DEFAULT 0,
  schedule_pay int NOT NULL DEFAULT 0,
  gg_swap_pay int NOT NULL DEFAULT 0,
  misc_pay int NOT NULL DEFAULT 0,
  bonus_percent decimal(5,2) NOT NULL DEFAULT 0,
  total_pay int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(chatter_id, month, year)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatter_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for chatter_details
CREATE POLICY "Users can view own chatter details"
  ON public.chatter_details FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own chatter details"
  ON public.chatter_details FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for pay_records
CREATE POLICY "Chatters can view own pay records"
  ON public.pay_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chatter_details
      WHERE chatter_details.id = pay_records.chatter_id
      AND chatter_details.user_id = auth.uid()
    )
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, dob)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'dob')::date, CURRENT_DATE)
  );
  RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();