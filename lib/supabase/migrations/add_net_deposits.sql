-- Migration: Add net_deposits column to user_profiles
-- Run this in your Supabase SQL Editor

-- Add net_deposits column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS net_deposits DECIMAL(15,2) DEFAULT 0;

-- Migrate existing data: set net_deposits = cash_balance for existing users
-- This ensures users who already have cash will have a proper baseline
UPDATE user_profiles
SET net_deposits = cash_balance
WHERE net_deposits IS NULL OR net_deposits = 0;

-- Comment for future reference
COMMENT ON COLUMN user_profiles.net_deposits IS 'Total deposits minus withdrawals - used as baseline for P&L calculations';
