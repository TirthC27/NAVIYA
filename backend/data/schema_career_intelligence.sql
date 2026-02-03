-- ============================================
-- NAVIYA - Agentic Career Intelligence Module
-- Supabase Database Schema
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types for Career Intelligence
-- ============================================

DROP TYPE IF EXISTS experience_level_type CASCADE;
DROP TYPE IF EXISTS skill_level_type CASCADE;
DROP TYPE IF EXISTS skill_source_type CASCADE;
DROP TYPE IF EXISTS interview_difficulty_type CASCADE;
DROP TYPE IF EXISTS agent_action_type CASCADE;

CREATE TYPE experience_level_type AS ENUM ('student', 'fresher', 'professional');
CREATE TYPE skill_level_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE skill_source_type AS ENUM ('manual', 'resume', 'assessment');
CREATE TYPE interview_difficulty_type AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE agent_action_type AS ENUM (
    'profile_created',
    'profile_updated',
    'skill_added',
    'skill_assessed',
    'resume_analyzed',
    'roadmap_generated',
    'interview_completed',
    'mentor_session',
    'recommendation_made'
);

-- ============================================
-- 1. USER_CAREER_PROFILE TABLE
-- Stores user's career goals and preferences
-- ============================================

CREATE TABLE user_career_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    career_goal TEXT,
    experience_level experience_level_type DEFAULT 'fresher',
    target_timeline_months INTEGER DEFAULT 12,
    weekly_hours INTEGER DEFAULT 10,
    preferred_learning_style TEXT,
    target_roles JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One profile per user
    UNIQUE(user_id)
);

CREATE INDEX idx_user_career_profile_user ON user_career_profile(user_id);
CREATE INDEX idx_user_career_profile_experience ON user_career_profile(experience_level);

-- ============================================
-- 2. USER_SKILLS TABLE
-- Tracks user's skills with proficiency levels
-- ============================================

CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_level skill_level_type DEFAULT 'beginner',
    source skill_source_type DEFAULT 'manual',
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique skill per user
    UNIQUE(user_id, skill_name)
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_name ON user_skills(skill_name);
CREATE INDEX idx_user_skills_level ON user_skills(skill_level);
CREATE INDEX idx_user_skills_source ON user_skills(source);

-- ============================================
-- 3. RESUME_ANALYSIS TABLE
-- Stores AI-extracted resume analysis results
-- ============================================

CREATE TABLE resume_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_filename VARCHAR(255),
    resume_url TEXT,
    extracted_skills JSONB DEFAULT '[]'::jsonb,
    extracted_experience JSONB DEFAULT '[]'::jsonb,
    extracted_education JSONB DEFAULT '[]'::jsonb,
    recommended_roles JSONB DEFAULT '[]'::jsonb,
    missing_skills JSONB DEFAULT '[]'::jsonb,
    resume_score INTEGER DEFAULT 0 CHECK (resume_score >= 0 AND resume_score <= 100),
    improvement_suggestions JSONB DEFAULT '[]'::jsonb,
    ats_compatibility_score INTEGER DEFAULT 0 CHECK (ats_compatibility_score >= 0 AND ats_compatibility_score <= 100),
    analysis_version VARCHAR(50) DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resume_analysis_user ON resume_analysis(user_id);
CREATE INDEX idx_resume_analysis_created ON resume_analysis(created_at DESC);
CREATE INDEX idx_resume_analysis_score ON resume_analysis(resume_score DESC);

-- ============================================
-- 4. CAREER_ROADMAP TABLE
-- Stores personalized career roadmap phases
-- ============================================

CREATE TABLE career_roadmap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    roadmap_title VARCHAR(500),
    phase_number INTEGER NOT NULL CHECK (phase_number > 0),
    phase_title VARCHAR(255) NOT NULL,
    phase_description TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    resources JSONB DEFAULT '[]'::jsonb,
    milestones JSONB DEFAULT '[]'::jsonb,
    exit_criteria TEXT,
    estimated_weeks INTEGER DEFAULT 4,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique phase number per user roadmap
    UNIQUE(user_id, phase_number)
);

CREATE INDEX idx_career_roadmap_user ON career_roadmap(user_id);
CREATE INDEX idx_career_roadmap_phase ON career_roadmap(user_id, phase_number);
CREATE INDEX idx_career_roadmap_completed ON career_roadmap(is_completed);

-- ============================================
-- 5. SKILL_ASSESSMENTS TABLE
-- Records skill assessment results
-- ============================================

CREATE TABLE skill_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(50) DEFAULT 'quiz',
    questions_count INTEGER DEFAULT 10,
    correct_answers INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    level_assigned skill_level_type,
    xp_earned INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    feedback JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_skill_assessments_user ON skill_assessments(user_id);
CREATE INDEX idx_skill_assessments_skill ON skill_assessments(skill_name);
CREATE INDEX idx_skill_assessments_created ON skill_assessments(created_at DESC);
CREATE INDEX idx_skill_assessments_score ON skill_assessments(score DESC);

-- ============================================
-- 6. MOCK_INTERVIEWS TABLE
-- Stores mock interview sessions and results
-- ============================================

CREATE TABLE mock_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    company_context VARCHAR(255),
    difficulty interview_difficulty_type DEFAULT 'medium',
    interview_type VARCHAR(50) DEFAULT 'behavioral',
    questions JSONB DEFAULT '[]'::jsonb,
    responses JSONB DEFAULT '[]'::jsonb,
    feedback JSONB DEFAULT '{}'::jsonb,
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    audio_url TEXT,
    transcript TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mock_interviews_user ON mock_interviews(user_id);
CREATE INDEX idx_mock_interviews_role ON mock_interviews(role);
CREATE INDEX idx_mock_interviews_difficulty ON mock_interviews(difficulty);
CREATE INDEX idx_mock_interviews_created ON mock_interviews(created_at DESC);
CREATE INDEX idx_mock_interviews_score ON mock_interviews(score DESC);

-- ============================================
-- 7. AGENT_ACTIVITY_LOG TABLE
-- Logs all agent actions for transparency
-- ============================================

CREATE TABLE agent_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    action_type agent_action_type NOT NULL,
    summary TEXT,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_activity_user ON agent_activity_log(user_id);
CREATE INDEX idx_agent_activity_agent ON agent_activity_log(agent_name);
CREATE INDEX idx_agent_activity_action ON agent_activity_log(action_type);
CREATE INDEX idx_agent_activity_created ON agent_activity_log(created_at DESC);
CREATE INDEX idx_agent_activity_success ON agent_activity_log(success);

-- ============================================
-- 8. MENTOR_SESSIONS TABLE (Bonus)
-- Tracks AI mentor interactions
-- ============================================

CREATE TABLE mentor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'general',
    topic VARCHAR(255),
    messages JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    sentiment_score FLOAT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mentor_sessions_user ON mentor_sessions(user_id);
CREATE INDEX idx_mentor_sessions_type ON mentor_sessions(session_type);
CREATE INDEX idx_mentor_sessions_created ON mentor_sessions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- Users can only access their own records
-- ============================================

-- Enable RLS on all Career Intelligence tables
ALTER TABLE user_career_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- user_career_profile policies
CREATE POLICY "Users can view own career profile"
    ON user_career_profile FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career profile"
    ON user_career_profile FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career profile"
    ON user_career_profile FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career profile"
    ON user_career_profile FOR DELETE
    USING (auth.uid() = user_id);

-- user_skills policies
CREATE POLICY "Users can view own skills"
    ON user_skills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
    ON user_skills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
    ON user_skills FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
    ON user_skills FOR DELETE
    USING (auth.uid() = user_id);

-- resume_analysis policies
CREATE POLICY "Users can view own resume analysis"
    ON resume_analysis FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resume analysis"
    ON resume_analysis FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resume analysis"
    ON resume_analysis FOR DELETE
    USING (auth.uid() = user_id);

-- career_roadmap policies
CREATE POLICY "Users can view own career roadmap"
    ON career_roadmap FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career roadmap"
    ON career_roadmap FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career roadmap"
    ON career_roadmap FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career roadmap"
    ON career_roadmap FOR DELETE
    USING (auth.uid() = user_id);

-- skill_assessments policies
CREATE POLICY "Users can view own skill assessments"
    ON skill_assessments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill assessments"
    ON skill_assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- mock_interviews policies
CREATE POLICY "Users can view own mock interviews"
    ON mock_interviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock interviews"
    ON mock_interviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock interviews"
    ON mock_interviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- agent_activity_log policies
CREATE POLICY "Users can view own agent activity"
    ON agent_activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert agent activity"
    ON agent_activity_log FOR INSERT
    WITH CHECK (true);

-- mentor_sessions policies
CREATE POLICY "Users can view own mentor sessions"
    ON mentor_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentor sessions"
    ON mentor_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor sessions"
    ON mentor_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp (reuse if exists)
CREATE OR REPLACE FUNCTION update_career_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on Career Intelligence tables
CREATE TRIGGER trigger_user_career_profile_updated
    BEFORE UPDATE ON user_career_profile
    FOR EACH ROW EXECUTE FUNCTION update_career_updated_at();

CREATE TRIGGER trigger_user_skills_updated
    BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_career_updated_at();

CREATE TRIGGER trigger_career_roadmap_updated
    BEFORE UPDATE ON career_roadmap
    FOR EACH ROW EXECUTE FUNCTION update_career_updated_at();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: User career summary
CREATE OR REPLACE VIEW v_user_career_summary AS
SELECT 
    ucp.user_id,
    ucp.career_goal,
    ucp.experience_level,
    ucp.target_timeline_months,
    COUNT(DISTINCT us.id) AS total_skills,
    COUNT(DISTINCT us.id) FILTER (WHERE us.skill_level = 'advanced') AS advanced_skills,
    COUNT(DISTINCT cr.id) AS roadmap_phases,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.is_completed = true) AS completed_phases,
    COUNT(DISTINCT sa.id) AS total_assessments,
    ROUND(AVG(sa.score)::numeric, 2) AS avg_assessment_score,
    COUNT(DISTINCT mi.id) AS total_interviews,
    ROUND(AVG(mi.score)::numeric, 2) AS avg_interview_score
FROM user_career_profile ucp
LEFT JOIN user_skills us ON ucp.user_id = us.user_id
LEFT JOIN career_roadmap cr ON ucp.user_id = cr.user_id
LEFT JOIN skill_assessments sa ON ucp.user_id = sa.user_id
LEFT JOIN mock_interviews mi ON ucp.user_id = mi.user_id
GROUP BY ucp.user_id, ucp.career_goal, ucp.experience_level, ucp.target_timeline_months;

-- View: Agent activity summary
CREATE OR REPLACE VIEW v_agent_activity_summary AS
SELECT 
    agent_name,
    action_type,
    COUNT(*) AS total_actions,
    COUNT(*) FILTER (WHERE success = true) AS successful_actions,
    ROUND(AVG(execution_time_ms)::numeric, 2) AS avg_execution_time_ms,
    SUM(tokens_used) AS total_tokens_used,
    MAX(created_at) AS last_activity
FROM agent_activity_log
GROUP BY agent_name, action_type
ORDER BY total_actions DESC;

-- ============================================
-- END OF CAREER INTELLIGENCE SCHEMA
-- ============================================
