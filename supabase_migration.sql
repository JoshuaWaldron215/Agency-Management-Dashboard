-- =====================================================
-- MAP MGT - Complete Database Migration
-- Run this in your Supabase SQL Editor (supabase.com)
-- =====================================================

-- =====================================================
-- STEP 1: CREATE ENUMS
-- =====================================================

CREATE TYPE app_role AS ENUM ('admin', 'manager', 'chatter');

CREATE TYPE audit_action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

CREATE TYPE audit_resource_type AS ENUM (
  'USER', 'MODEL', 'SHEET', 'ROLE', 'TEAM', 
  'SCHEDULE', 'SALES', 'HOURS', 'TIME_OFF', 'ACCOUNT'
);

CREATE TYPE time_off_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELED');

CREATE TYPE time_off_type AS ENUM ('SICK', 'PERSONAL', 'VACATION', 'OTHER');

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table (linked to Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  dob DATE NOT NULL DEFAULT '2000-01-01',
  avatar_url TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'chatter',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Chatter details table
CREATE TABLE chatter_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pay_class TEXT NOT NULL DEFAULT 'standard',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discord_username TEXT,
  fansmetric_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Models table (OnlyFans models/accounts)
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Chatter sheets (weekly performance sheets)
CREATE TABLE chatter_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id UUID NOT NULL REFERENCES chatter_details(id) ON DELETE CASCADE,
  chatter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chatter_name TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chatter_id, week_start_date)
);

-- Chatter sheet daily sales (EXPANDED with sale type tracking)
CREATE TABLE chatter_sheet_daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES chatter_sheets(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  -- NEW: Expanded columns for detailed tracking
  gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  -- Sale type breakdown
  ppv_count INTEGER NOT NULL DEFAULT 0,
  ppv_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subscription_count INTEGER NOT NULL DEFAULT 0,
  subscription_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tips_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  bundles_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  other_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, model_id, sale_date)
);

-- Chatter daily hours
CREATE TABLE chatter_daily_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES chatter_sheets(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, work_date)
);

-- Chatter sheet accounts (legacy/alternative tracking)
CREATE TABLE chatter_sheet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES chatter_sheets(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pay records (historical pay data)
CREATE TABLE pay_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id UUID NOT NULL REFERENCES chatter_details(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  shift_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  schedule_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gg_swap_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  misc_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  bonus_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  total_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chatter_id, year, month)
);

-- Schedule weeks
CREATE TABLE schedule_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  assigned_models TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, week_start_date)
);

-- Shift slots
CREATE TABLE shift_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  label TEXT NOT NULL,
  start_local TEXT NOT NULL,
  end_local TEXT NOT NULL,
  assigned TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Time off requests
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type time_off_type NOT NULL DEFAULT 'PERSONAL',
  status time_off_status NOT NULL DEFAULT 'PENDING',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action_type audit_action_type NOT NULL,
  resource_type audit_resource_type NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_profiles_team ON profiles(team_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_chatter_details_user ON chatter_details(user_id);
CREATE INDEX idx_chatter_sheets_chatter ON chatter_sheets(chatter_id);
CREATE INDEX idx_chatter_sheets_week ON chatter_sheets(week_start_date);
CREATE INDEX idx_chatter_sheets_user ON chatter_sheets(chatter_user_id);
CREATE INDEX idx_daily_sales_sheet ON chatter_sheet_daily_sales(sheet_id);
CREATE INDEX idx_daily_sales_model ON chatter_sheet_daily_sales(model_id);
CREATE INDEX idx_daily_sales_date ON chatter_sheet_daily_sales(sale_date);
CREATE INDEX idx_daily_hours_sheet ON chatter_daily_hours(sheet_id);
CREATE INDEX idx_daily_hours_date ON chatter_daily_hours(work_date);
CREATE INDEX idx_models_deleted ON models(deleted_at);
CREATE INDEX idx_schedule_weeks_team ON schedule_weeks(team_id);
CREATE INDEX idx_schedule_weeks_date ON schedule_weeks(week_start_date);
CREATE INDEX idx_shift_slots_week ON shift_slots(week_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit entries
CREATE OR REPLACE FUNCTION log_audit(
  _action_type audit_action_type,
  _resource_type audit_resource_type,
  _resource_id TEXT DEFAULT NULL,
  _resource_name TEXT DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _actor_name TEXT;
  _new_id UUID;
BEGIN
  SELECT COALESCE(p.name, 'System') INTO _actor_name
  FROM profiles p
  WHERE p.id = auth.uid();
  
  IF _actor_name IS NULL THEN
    _actor_name := 'System';
  END IF;

  INSERT INTO audit_logs (
    actor_id, actor_name, action_type, resource_type, 
    resource_id, resource_name, details
  )
  VALUES (
    auth.uid(), _actor_name, _action_type, _resource_type,
    _resource_id, _resource_name, _details
  )
  RETURNING id INTO _new_id;
  
  RETURN _new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatter_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatter_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatter_sheet_daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatter_daily_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatter_sheet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- Teams: Everyone can read, admins can write
CREATE POLICY "Teams are viewable by authenticated users" ON teams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Profiles: Users can read all, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles: Admins can manage, users can read own
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Chatter details: Users see own, admins see all
CREATE POLICY "Users can view own chatter details" ON chatter_details
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role('admin', auth.uid()));
CREATE POLICY "Admins can manage chatter details" ON chatter_details
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));
CREATE POLICY "Users can update own chatter details" ON chatter_details
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Models: Everyone can read, admins can write
CREATE POLICY "Models are viewable by authenticated users" ON models
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage models" ON models
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Chatter sheets: Users see own, admins see all
CREATE POLICY "Users can view own sheets" ON chatter_sheets
  FOR SELECT TO authenticated 
  USING (chatter_user_id = auth.uid() OR has_role('admin', auth.uid()));
CREATE POLICY "Admins can manage all sheets" ON chatter_sheets
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));
CREATE POLICY "Users can update own sheets" ON chatter_sheets
  FOR UPDATE TO authenticated USING (chatter_user_id = auth.uid());

-- Daily sales: Based on sheet access
CREATE POLICY "Users can view sales for their sheets" ON chatter_sheet_daily_sales
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_sheets cs 
      WHERE cs.id = sheet_id 
      AND (cs.chatter_user_id = auth.uid() OR has_role('admin', auth.uid()))
    )
  );
CREATE POLICY "Users can manage sales for their sheets" ON chatter_sheet_daily_sales
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_sheets cs 
      WHERE cs.id = sheet_id 
      AND (cs.chatter_user_id = auth.uid() OR has_role('admin', auth.uid()))
    )
  );

-- Daily hours: Based on sheet access
CREATE POLICY "Users can view hours for their sheets" ON chatter_daily_hours
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_sheets cs 
      WHERE cs.id = sheet_id 
      AND (cs.chatter_user_id = auth.uid() OR has_role('admin', auth.uid()))
    )
  );
CREATE POLICY "Users can manage hours for their sheets" ON chatter_daily_hours
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_sheets cs 
      WHERE cs.id = sheet_id 
      AND (cs.chatter_user_id = auth.uid() OR has_role('admin', auth.uid()))
    )
  );

-- Sheet accounts: Based on sheet access
CREATE POLICY "Users can view accounts for their sheets" ON chatter_sheet_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_sheets cs 
      WHERE cs.id = sheet_id 
      AND (cs.chatter_user_id = auth.uid() OR has_role('admin', auth.uid()))
    )
  );

-- Pay records: Users see own, admins see all
CREATE POLICY "Users can view own pay records" ON pay_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatter_details cd 
      WHERE cd.id = chatter_id AND cd.user_id = auth.uid()
    ) OR has_role('admin', auth.uid())
  );
CREATE POLICY "Admins can manage pay records" ON pay_records
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Schedule weeks: Team members can view, admins can manage
CREATE POLICY "Authenticated users can view schedules" ON schedule_weeks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedules" ON schedule_weeks
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Shift slots: Same as schedule weeks
CREATE POLICY "Authenticated users can view shifts" ON shift_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage shifts" ON shift_slots
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Time off requests: Users see own, admins see all
CREATE POLICY "Users can view own time off requests" ON time_off_requests
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR has_role('admin', auth.uid()));
CREATE POLICY "Users can create own time off requests" ON time_off_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own time off requests" ON time_off_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all time off requests" ON time_off_requests
  FOR ALL TO authenticated USING (has_role('admin', auth.uid()));

-- Audit logs: Only admins can view
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (has_role('admin', auth.uid()));
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- STEP 7: CREATE TRIGGER FOR AUTO-UPDATING updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chatter_sheets_updated_at BEFORE UPDATE ON chatter_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_daily_sales_updated_at BEFORE UPDATE ON chatter_sheet_daily_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_daily_hours_updated_at BEFORE UPDATE ON chatter_daily_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schedule_weeks_updated_at BEFORE UPDATE ON schedule_weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shift_slots_updated_at BEFORE UPDATE ON shift_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_time_off_updated_at BEFORE UPDATE ON time_off_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- STEP 8: CREATE TRIGGER FOR NEW USER SETUP
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _chatter_id UUID;
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, name, dob)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, '2000-01-01'::DATE)
  );
  
  -- Assign default chatter role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'chatter');
  
  -- Create chatter details
  INSERT INTO chatter_details (user_id, pay_class, start_date)
  VALUES (NEW.id, 'standard', CURRENT_DATE)
  RETURNING id INTO _chatter_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
