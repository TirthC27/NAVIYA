-- ============================================
-- NAVIYA - Onboarding Schema
-- User onboarding flow and context storage
-- ============================================

-- ============================================
-- Table: user_context
-- Stores user onboarding data and preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Step 1: Domain Selection
    selected_domain TEXT,
    
    -- Step 2: Education Level
    education_level TEXT,
    
    -- Step 3: Current Stage
    current_stage TEXT,
    
    -- Step 4: Career Goal
    career_goal_raw TEXT,
    
    -- Step 5: Self Assessment
    self_assessed_level TEXT CHECK (self_assessed_level IN ('beginner', 'intermediate', 'advanced', 'unknown')),
    
    -- Step 6: Time Commitment
    weekly_hours INTEGER DEFAULT 10 CHECK (weekly_hours >= 0 AND weekly_hours <= 168),
    
    -- Step 7: Primary Blocker
    primary_blocker TEXT,
    
    -- Onboarding Status
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0 CHECK (onboarding_step >= 0 AND onboarding_step <= 7),
    
    -- Supervisor Status
    supervisor_initialized BOOLEAN DEFAULT FALSE,
    supervisor_last_run TIMESTAMP WITH TIME ZONE,
    
    -- Additional Context (for AI agents)
    interests JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT user_context_unique_user UNIQUE(user_id)
);

-- ============================================
-- Table: agent_tasks
-- Tracks supervisor and agent initialization tasks
-- ============================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Task Details
    task_type TEXT NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT,
    agent_name TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    
    -- Data
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    
    -- Execution Metrics
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- user_context indexes
CREATE INDEX IF NOT EXISTS idx_user_context_user_id ON user_context(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_onboarding_completed ON user_context(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_context_supervisor_initialized ON user_context(supervisor_initialized);
CREATE INDEX IF NOT EXISTS idx_user_context_selected_domain ON user_context(selected_domain);
CREATE INDEX IF NOT EXISTS idx_user_context_self_assessed_level ON user_context(self_assessed_level);

-- agent_tasks indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_id ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_task_type ON agent_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_status ON agent_tasks(user_id, status);

-- ============================================
-- Triggers
-- ============================================

-- Create or replace the update_updated_at_column function (in case it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at for user_context
CREATE TRIGGER trigger_user_context_updated_at
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for agent_tasks
CREATE TRIGGER trigger_agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set completed_at when onboarding is completed
CREATE OR REPLACE FUNCTION set_onboarding_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onboarding_completed = TRUE AND OLD.onboarding_completed = FALSE THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_onboarding_completed_at
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE FUNCTION set_onboarding_completed_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE user_context IS 'Stores user onboarding data and career preferences';
COMMENT ON COLUMN user_context.selected_domain IS 'Domain selected in Step 1 (e.g., Technology/Engineering, Medical/Healthcare)';
COMMENT ON COLUMN user_context.education_level IS 'Education level selected in Step 2';
COMMENT ON COLUMN user_context.current_stage IS 'Current career stage selected in Step 3';
COMMENT ON COLUMN user_context.career_goal_raw IS 'Free-text career goal from Step 4';
COMMENT ON COLUMN user_context.self_assessed_level IS 'Self-assessment from Step 5 (beginner/intermediate/advanced/unknown)';
COMMENT ON COLUMN user_context.weekly_hours IS 'Weekly time commitment from Step 6 (in hours)';
COMMENT ON COLUMN user_context.primary_blocker IS 'Main challenge/blocker from Step 7';
COMMENT ON COLUMN user_context.onboarding_completed IS 'Whether user completed all 7 onboarding steps';
COMMENT ON COLUMN user_context.supervisor_initialized IS 'Whether SupervisorAgent has run for this user';

COMMENT ON TABLE agent_tasks IS 'Tracks background tasks created by supervisor and other agents';
COMMENT ON COLUMN agent_tasks.task_type IS 'Type of task (e.g., resume_analysis, roadmap_generation)';
COMMENT ON COLUMN agent_tasks.status IS 'Current task status (pending/running/completed/failed)';

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get onboarding progress percentage
CREATE OR REPLACE FUNCTION get_onboarding_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_step INTEGER;
    v_completed BOOLEAN;
BEGIN
    SELECT onboarding_step, onboarding_completed 
    INTO v_step, v_completed
    FROM user_context 
    WHERE user_id = p_user_id;
    
    IF v_completed THEN
        RETURN 100;
    ELSIF v_step IS NULL THEN
        RETURN 0;
    ELSE
        RETURN (v_step * 100) / 7;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Onboarding schema created successfully';
    RAISE NOTICE '📝 Created tables: user_context, agent_tasks';
    RAISE NOTICE '🎯 7-step onboarding flow ready';
    RAISE NOTICE '🤖 Supervisor task tracking enabled';
END $$;
