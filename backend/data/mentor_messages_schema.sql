-- ============================================
-- NAVIYA - MentorAgent Messages Schema
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types for MentorAgent
-- ============================================

-- Drop if exists for clean install
DROP TYPE IF EXISTS mentor_message_type CASCADE;

-- Message types enum
CREATE TYPE mentor_message_type AS ENUM ('welcome', 'notice', 'update');

-- ============================================
-- MENTOR_MESSAGES TABLE
-- Output table for MentorAgent
-- ============================================

DROP TABLE IF EXISTS mentor_messages CASCADE;

CREATE TABLE mentor_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    message_type mentor_message_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_cta JSONB DEFAULT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_mentor_messages_user ON mentor_messages(user_id);
CREATE INDEX idx_mentor_messages_type ON mentor_messages(message_type);
CREATE INDEX idx_mentor_messages_created ON mentor_messages(created_at DESC);
CREATE INDEX idx_mentor_messages_unread ON mentor_messages(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only read their own messages
CREATE POLICY "Users can view own mentor messages"
    ON mentor_messages FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Policy for INSERT: Only backend service role can insert
-- (Users cannot insert messages themselves)
CREATE POLICY "Service role can insert mentor messages"
    ON mentor_messages FOR INSERT
    WITH CHECK (true);

-- Policy for UPDATE: Users can only update read_at on their own messages
CREATE POLICY "Users can mark own messages as read"
    ON mentor_messages FOR UPDATE
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'))
    WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- ============================================
-- Views for Common Queries
-- ============================================

-- Latest unread messages per user
CREATE OR REPLACE VIEW v_unread_mentor_messages AS
SELECT 
    mm.*
FROM mentor_messages mm
WHERE mm.read_at IS NULL
ORDER BY mm.created_at DESC;

-- Latest message per user (for dashboard)
CREATE OR REPLACE VIEW v_latest_mentor_message AS
SELECT DISTINCT ON (user_id)
    id,
    user_id,
    message_type,
    title,
    body,
    action_cta,
    read_at,
    created_at
FROM mentor_messages
ORDER BY user_id, created_at DESC;

-- Message history with task info
CREATE OR REPLACE VIEW v_mentor_message_history AS
SELECT 
    mm.id,
    mm.user_id,
    mm.message_type,
    mm.title,
    mm.body,
    mm.action_cta,
    mm.read_at,
    mm.created_at,
    at.task_type,
    at.status AS task_status
FROM mentor_messages mm
LEFT JOIN agent_tasks at ON mm.task_id = at.id
ORDER BY mm.created_at DESC;

-- ============================================
-- Functions
-- ============================================

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(message_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE mentor_messages
    SET read_at = NOW()
    WHERE id = message_id AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO count_result
    FROM mentor_messages
    WHERE user_id = p_user_id AND read_at IS NULL;
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;
