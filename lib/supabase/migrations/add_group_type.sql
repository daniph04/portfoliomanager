-- Migration: Add 'type' field to groups table
-- This enables detection of auto-created private groups vs user-created leagues
-- Run this in your Supabase SQL Editor BEFORE deploying code changes

-- Add type column with constraint
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'shared'
CHECK (type IN ('private', 'shared'));

-- Migrate existing data: mark all current groups as 'shared'
UPDATE groups 
SET type = 'shared' 
WHERE type IS NULL;

-- Add documentation
COMMENT ON COLUMN groups.type IS 
  'Group type: private (auto-created solo portfolio) or shared (multi-member league)';
