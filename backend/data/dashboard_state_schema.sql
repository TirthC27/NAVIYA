-- ============================================
-- NAVIYA Dashboard State Schema
-- Single source of truth for UI rendering
-- ============================================
-- ONLY agents update this table
-- UI ONLY reads this table
-- ============================================

-- Drop existing table for clean install
DROP TABLE IF EXISTS dashboard_state CASCADE;

-- ============================================
-- Main Dashboard State Table
-- ============================================
CREATE TABLE dashboard_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current phase in learning journey
    current_phase TEXT DEFAULT 'onboarding',
    
    -- Feature readiness flags (unlocked by agents)
    resume_ready BOOLEAN DEFAULT FALSE,
    roadmap_ready BOOLEAN DEFAULT FALSE,
    skill_eval_ready BOOLEAN DEFAULT FALSE,
    interview_ready BOOLEAN DEFAULT FALSE,
    mentor_ready BOOLEAN DEFAULT TRUE,  -- Mentor is always available
    
    -- Domain context
    domain TEXT CHECK (domain IN ('tech', 'medical')),
    
    -- Tracking
    last_updated_by_agent TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_dashboard_state_updated_at ON dashboard_state(updated_at DESC);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE dashboard_state ENABLE ROW LEVEL SECURITY;

-- Users can only read their own state
CREATE POLICY "Users can view own dashboard state"
    ON dashboard_state FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role (agents) can update
CREATE POLICY "Service role can update dashboard state"
    ON dashboard_state FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_state;

-- ============================================
-- Functions
-- ============================================

-- Initialize dashboard state for new user
CREATE OR REPLACE FUNCTION initialize_dashboard_state(p_user_id UUID, p_domain TEXT DEFAULT NULL)
RETURNS dashboard_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state dashboard_state;
BEGIN
    INSERT INTO dashboard_state (user_id, domain, current_phase)
    VALUES (p_user_id, p_domain, 'onboarding')
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = NOW()
    RETURNING * INTO v_state;
    
    RETURN v_state;
END;
$$;

-- Update dashboard state (called by agents)
CREATE OR REPLACE FUNCTION update_dashboard_state(
    p_user_id UUID,
    p_agent_name TEXT,
    p_resume_ready BOOLEAN DEFAULT NULL,
    p_roadmap_ready BOOLEAN DEFAULT NULL,
    p_skill_eval_ready BOOLEAN DEFAULT NULL,
    p_interview_ready BOOLEAN DEFAULT NULL,
    p_current_phase TEXT DEFAULT NULL,
    p_domain TEXT DEFAULT NULL
)
RETURNS dashboard_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state dashboard_state;
BEGIN
    -- Ensure state exists
    INSERT INTO dashboard_state (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update only provided fields
    UPDATE dashboard_state
    SET
        resume_ready = COALESCE(p_resume_ready, resume_ready),
        roadmap_ready = COALESCE(p_roadmap_ready, roadmap_ready),
        skill_eval_ready = COALESCE(p_skill_eval_ready, skill_eval_ready),
        interview_ready = COALESCE(p_interview_ready, interview_ready),
        current_phase = COALESCE(p_current_phase, current_phase),
        domain = COALESCE(p_domain, domain),
        last_updated_by_agent = p_agent_name,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_state;
    
    RETURN v_state;
END;
$$;

-- Get dashboard state with computed properties
CREATE OR REPLACE FUNCTION get_dashboard_state(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state dashboard_state;
    v_result JSON;
BEGIN
    SELECT * INTO v_state
    FROM dashboard_state
    WHERE user_id = p_user_id;
    
    IF v_state IS NULL THEN
        -- Return default state
        RETURN json_build_object(
            'user_id', p_user_id,
            'current_phase', 'onboarding',
            'resume_ready', false,
            'roadmap_ready', false,
            'skill_eval_ready', false,
            'interview_ready', false,
            'mentor_ready', true,
            'domain', null,
            'last_updated_by_agent', null,
            'features_unlocked', 0
        );
    END IF;
    
    -- Calculate features unlocked
    SELECT json_build_object(
        'user_id', v_state.user_id,
        'current_phase', v_state.current_phase,
        'resume_ready', v_state.resume_ready,
        'roadmap_ready', v_state.roadmap_ready,
        'skill_eval_ready', v_state.skill_eval_ready,
        'interview_ready', v_state.interview_ready,
        'mentor_ready', v_state.mentor_ready,
        'domain', v_state.domain,
        'last_updated_by_agent', v_state.last_updated_by_agent,
        'updated_at', v_state.updated_at,
        'features_unlocked', (
            CASE WHEN v_state.resume_ready THEN 1 ELSE 0 END +
            CASE WHEN v_state.roadmap_ready THEN 1 ELSE 0 END +
            CASE WHEN v_state.skill_eval_ready THEN 1 ELSE 0 END +
            CASE WHEN v_state.interview_ready THEN 1 ELSE 0 END
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- ============================================
-- Trigger: Auto-update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_dashboard_state_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_dashboard_state_timestamp
    BEFORE UPDATE ON dashboard_state
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_state_timestamp();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE dashboard_state IS 'Single source of truth for UI rendering. ONLY agents update, UI ONLY reads.';
COMMENT ON COLUMN dashboard_state.resume_ready IS 'Set by ResumeIntelligenceAgent after successful resume analysis';
COMMENT ON COLUMN dashboard_state.roadmap_ready IS 'Set by RoadmapAgent after roadmap generation';
COMMENT ON COLUMN dashboard_state.skill_eval_ready IS 'Set by SkillEvaluationAgent after first assessment';
COMMENT ON COLUMN dashboard_state.interview_ready IS 'Set when user is ready for mock interviews';
COMMENT ON COLUMN dashboard_state.current_phase IS 'Current learning phase: onboarding, foundation, core_skills, application, readiness';
