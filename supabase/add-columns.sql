-- 1. Add columns to customer_profiles to support Buffalo Premium Tier and pricing
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS buffalo_tier TEXT DEFAULT 'standard';
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS buffalo_premium_rate NUMERIC DEFAULT 80;

-- 2. Add columns to daily_cash_sales to support milk type, rate, and liters details for walk-in cash customers
ALTER TABLE daily_cash_sales ADD COLUMN IF NOT EXISTS milk_type TEXT DEFAULT 'cow';
ALTER TABLE daily_cash_sales ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 60;
ALTER TABLE daily_cash_sales ADD COLUMN IF NOT EXISTS liters NUMERIC DEFAULT 0;

-- 3. Add raw_password to users table to save user passwords in plain text for backup
ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_password TEXT DEFAULT 'Chotabhai@123';

