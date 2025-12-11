-- Performance Indexes for MAP MGT Dashboard
-- Run this in Supabase Dashboard > SQL Editor
-- These indexes will speed up dashboard, leaderboard, and model queries

-- =====================================================
-- CHATTER SHEETS - Core table for weekly performance
-- =====================================================

-- Speed up queries filtering by chatter
CREATE INDEX IF NOT EXISTS idx_chatter_sheets_chatter_user_id 
ON chatter_sheets(chatter_user_id);

-- Speed up date range queries (week filtering)
CREATE INDEX IF NOT EXISTS idx_chatter_sheets_week_start_date 
ON chatter_sheets(week_start_date);

-- Speed up queries by chatter name (for earnings history)
CREATE INDEX IF NOT EXISTS idx_chatter_sheets_chatter_name 
ON chatter_sheets(chatter_name);

-- Composite index for common query pattern (user + date)
CREATE INDEX IF NOT EXISTS idx_chatter_sheets_user_week 
ON chatter_sheets(chatter_user_id, week_start_date);

-- =====================================================
-- DAILY SALES - High-volume table for sales breakdown
-- =====================================================

-- Speed up date filtering (most common filter)
CREATE INDEX IF NOT EXISTS idx_daily_sales_sale_date 
ON chatter_sheet_daily_sales(sale_date);

-- Speed up lookups by sheet
CREATE INDEX IF NOT EXISTS idx_daily_sales_sheet_id 
ON chatter_sheet_daily_sales(sheet_id);

-- Speed up model earnings queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_model_id 
ON chatter_sheet_daily_sales(model_id);

-- Composite for date range + model queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_date_model 
ON chatter_sheet_daily_sales(sale_date, model_id);

-- =====================================================
-- DAILY HOURS - Hours tracking table
-- =====================================================

-- Speed up date filtering
CREATE INDEX IF NOT EXISTS idx_daily_hours_work_date 
ON chatter_daily_hours(work_date);

-- Speed up lookups by sheet
CREATE INDEX IF NOT EXISTS idx_daily_hours_sheet_id 
ON chatter_daily_hours(sheet_id);

-- =====================================================
-- MODEL TRANSACTIONS - Transaction history
-- =====================================================

-- Speed up model page queries
CREATE INDEX IF NOT EXISTS idx_model_transactions_model_id 
ON model_transactions(model_id);

-- Speed up date range filtering
CREATE INDEX IF NOT EXISTS idx_model_transactions_date 
ON model_transactions(transaction_date);

-- Speed up category filtering (PPV, Tips, etc.)
CREATE INDEX IF NOT EXISTS idx_model_transactions_category 
ON model_transactions(category);

-- Composite for model + date queries
CREATE INDEX IF NOT EXISTS idx_model_transactions_model_date 
ON model_transactions(model_id, transaction_date);

-- =====================================================
-- PROFILES - User profiles
-- =====================================================

-- Speed up team filtering
CREATE INDEX IF NOT EXISTS idx_profiles_team_id 
ON profiles(team_id);

-- Speed up status filtering (for active/deleted users)
CREATE INDEX IF NOT EXISTS idx_profiles_status 
ON profiles(status);

-- =====================================================
-- AUDIT LOGS - Activity tracking (table name: audit_logs)
-- =====================================================

-- Speed up date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at);

-- Speed up user activity lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id 
ON audit_logs(actor_id);

-- Speed up action type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type 
ON audit_logs(action_type);

-- =====================================================
-- MODELS - Model profiles
-- =====================================================

-- Speed up active model queries (exclude soft-deleted)
CREATE INDEX IF NOT EXISTS idx_models_deleted_at 
ON models(deleted_at);

-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
