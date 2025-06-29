-- Migration script to simplify meal plans to be user-specific only
-- This removes the family_id dependency from meal plans

-- Drop the existing unique constraint
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_family_id_week_start_date_key;

-- Drop the existing index
DROP INDEX IF EXISTS idx_meal_plans_user_family_week;

-- Remove the family_id column
ALTER TABLE meal_plans DROP COLUMN IF EXISTS family_id;

-- Add the new unique constraint
ALTER TABLE meal_plans ADD CONSTRAINT meal_plans_user_id_week_start_date_key UNIQUE (user_id, week_start_date);

-- Create the new index
CREATE INDEX idx_meal_plans_user_week ON meal_plans(user_id, week_start_date);

-- Note: This migration assumes that there are no conflicting meal plans for the same user and week
-- If there are conflicts, they will need to be resolved manually before running this migration 