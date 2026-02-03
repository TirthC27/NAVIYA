-- ============================================
-- Fix Foreign Key Constraints
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Fix resume_documents foreign key to point to auth.users
ALTER TABLE resume_documents
DROP CONSTRAINT IF EXISTS resume_documents_user_id_fkey;

ALTER TABLE resume_documents
ADD CONSTRAINT resume_documents_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. Fix agent_activity_log foreign key
ALTER TABLE agent_activity_log
DROP CONSTRAINT IF EXISTS agent_activity_log_user_id_fkey;

ALTER TABLE agent_activity_log
ADD CONSTRAINT agent_activity_log_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Add missing columns to agent_activity_log
ALTER TABLE agent_activity_log 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

ALTER TABLE agent_activity_log 
ADD COLUMN IF NOT EXISTS error_details TEXT DEFAULT NULL;

-- Add constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'agent_activity_log_status_check'
    ) THEN
        ALTER TABLE agent_activity_log 
        ADD CONSTRAINT agent_activity_log_status_check 
        CHECK (status IN ('success', 'failure'));
    END IF;
END $$;

-- 4. Verify all constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('resume_documents', 'agent_activity_log')
ORDER BY tc.table_name, tc.constraint_type;
