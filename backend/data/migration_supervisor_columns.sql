-- ============================================
-- NAVIYA - Migration: Add SupervisorAgent columns
-- Run this if you already have the user_context table
-- ============================================

-- Add normalized_goal column (JSONB for structured goal data)
ALTER TABLE user_context 
ADD COLUMN IF NOT EXISTS normalized_goal JSONB DEFAULT NULL;

-- Add current_phase column (for tracking user journey phase)
ALTER TABLE user_context 
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_context.normalized_goal IS 'Structured goal from SupervisorAgent: {primary_track, confidence}';
COMMENT ON COLUMN user_context.current_phase IS 'User journey phase: exploration, guided, advanced, etc.';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_context'
ORDER BY ordinal_position;
