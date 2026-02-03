-- ============================================
-- NAVIYA - Onboarding & Agent Foundation Schema
-- System Bootstrap for Multi-Agent Platform
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP existing tables (for fresh install)
-- ============================================
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS user_context CASCADE;
DROP TYPE IF EXISTS self_assessed_level_type CASCADE;
DROP TYPE IF EXISTS agent_task_status CASCADE;

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE self_assessed_level_type AS ENUM ('beginner', 'intermediate', 'advanced', 'unknown');
CREATE TYPE agent_task_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- ============================================
-- 1. USER_CONTEXT TABLE
-- Canonical initial user state for all agents
-- ============================================

CREATE TABLE user_context (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    selected_domain TEXT,
    career_goal_raw TEXT,
    education_level TEXT,
    current_stage TEXT,
    self_assessed_level self_assessed_level_type DEFAULT 'unknown',
    weekly_hours INTEGER DEFAULT 10,
    primary_blocker TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    supervisor_initialized BOOLEAN DEFAULT FALSE,
    -- SupervisorAgent-managed fields
    normalized_goal JSONB DEFAULT NULL,
    current_phase TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_user_context_onboarding ON user_context(onboarding_completed);
CREATE INDEX idx_user_context_supervisor ON user_context(supervisor_initialized);
CREATE INDEX idx_user_context_domain ON user_context(selected_domain);

-- ============================================
-- 2. AGENT_TASKS TABLE
-- Task queue for all agents
-- ============================================

CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    task_payload JSONB DEFAULT '{}'::jsonb,
    status agent_task_status DEFAULT 'pending',
    result JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent task queries
CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_name);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_pending ON agent_tasks(user_id, agent_name, status) WHERE status = 'pending';

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on both tables
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_CONTEXT RLS Policies
-- Users can only access their own row
-- ============================================

-- Policy for SELECT: Users can only read their own context
CREATE POLICY "Users can view own context"
    ON user_context FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Policy for INSERT: Users can only insert their own context
CREATE POLICY "Users can insert own context"
    ON user_context FOR INSERT
    WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Policy for UPDATE: Users can only update their own context
CREATE POLICY "Users can update own context"
    ON user_context FOR UPDATE
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'))
    WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Service role full access for backend operations
CREATE POLICY "Service full access user_context"
    ON user_context FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- AGENT_TASKS RLS Policies
-- Users cannot directly modify tasks
-- Only service role (backend) can access
-- ============================================

-- Service role full access for backend operations
CREATE POLICY "Service full access agent_tasks"
    ON agent_tasks FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can only view their own tasks (read-only)
CREATE POLICY "Users can view own tasks"
    ON agent_tasks FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_user_context_updated
    BEFORE UPDATE ON user_context
    FOR EACH ROW EXECUTE FUNCTION update_context_updated_at();

CREATE TRIGGER trigger_agent_tasks_updated
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW EXECUTE FUNCTION update_context_updated_at();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Users pending supervisor initialization
CREATE OR REPLACE VIEW v_pending_supervisor_init AS
SELECT 
    uc.user_id,
    uc.selected_domain,
    uc.career_goal_raw,
    uc.education_level,
    uc.current_stage,
    uc.self_assessed_level,
    uc.weekly_hours,
    uc.primary_blocker,
    u.email,
    u.display_name
FROM user_context uc
JOIN users u ON uc.user_id = u.id
WHERE uc.onboarding_completed = true 
  AND uc.supervisor_initialized = false;

-- View: Agent task queue summary
CREATE OR REPLACE VIEW v_agent_task_summary AS
SELECT 
    agent_name,
    task_type,
    status,
    COUNT(*) AS task_count,
    MAX(created_at) AS latest_task
FROM agent_tasks
GROUP BY agent_name, task_type, status
ORDER BY agent_name, status;

-- ============================================
-- END OF ONBOARDING SCHEMA
-- ============================================
