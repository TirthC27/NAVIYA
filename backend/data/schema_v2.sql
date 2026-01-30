-- ============================================
-- LearnTube AI - Supabase Database Schema v2.0
-- Progressive Learning Assistant with OPIK Integration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP existing tables (for fresh install)
-- ============================================
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS eval_runs CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS roadmap_steps CASCADE;
DROP TABLE IF EXISTS learning_plans CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS progress_status CASCADE;
DROP TYPE IF EXISTS feedback_rating CASCADE;
DROP TYPE IF EXISTS learning_mode_type CASCADE;

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE progress_status AS ENUM ('pending', 'watched');
CREATE TYPE feedback_rating AS ENUM ('up', 'down');
CREATE TYPE learning_mode_type AS ENUM ('quick', 'standard', 'comprehensive');

-- ============================================
-- 1. USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. LEARNING_PLANS TABLE
-- ============================================

CREATE TABLE learning_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(500) NOT NULL,
    learning_mode learning_mode_type DEFAULT 'standard',
    current_depth_level INTEGER DEFAULT 1,
    max_depth_level INTEGER DEFAULT 3,
    difficulty VARCHAR(20) DEFAULT 'medium',
    estimated_time VARCHAR(50),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_plans_user ON learning_plans(user_id);
CREATE INDEX idx_learning_plans_topic ON learning_plans(topic);
CREATE INDEX idx_learning_plans_created ON learning_plans(created_at DESC);

-- ============================================
-- 3. ROADMAP_STEPS TABLE
-- ============================================

CREATE TABLE roadmap_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    depth_level INTEGER NOT NULL DEFAULT 1,
    step_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    search_query VARCHAR(500),
    is_unlocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique step numbers within a plan at each depth
    UNIQUE(plan_id, depth_level, step_number)
);

CREATE INDEX idx_roadmap_steps_plan ON roadmap_steps(plan_id);
CREATE INDEX idx_roadmap_steps_depth ON roadmap_steps(plan_id, depth_level);
CREATE INDEX idx_roadmap_steps_order ON roadmap_steps(plan_id, depth_level, step_number);

-- ============================================
-- 4. VIDEOS TABLE (1:1 with roadmap_steps)
-- ============================================

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL UNIQUE REFERENCES roadmap_steps(id) ON DELETE CASCADE,
    video_id VARCHAR(50) NOT NULL,  -- YouTube video ID
    title VARCHAR(500) NOT NULL,
    channel_title VARCHAR(255),
    duration_seconds INTEGER,
    duration_formatted VARCHAR(20),
    view_count BIGINT,
    thumbnail_url TEXT,
    url TEXT NOT NULL,
    has_captions BOOLEAN DEFAULT FALSE,
    relevance_score FLOAT,
    fetch_latency_ms FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UNIQUE constraint on step_id enforces 1 video per step
CREATE INDEX idx_videos_step ON videos(step_id);
CREATE INDEX idx_videos_youtube ON videos(video_id);

-- ============================================
-- 5. PROGRESS TABLE
-- ============================================

CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES roadmap_steps(id) ON DELETE CASCADE,
    status progress_status DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    watch_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each user can have one progress entry per step
    UNIQUE(user_id, step_id)
);

CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_step ON progress(step_id);
CREATE INDEX idx_progress_status ON progress(user_id, status);

-- ============================================
-- 6. FEEDBACK TABLE
-- ============================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    rating feedback_rating NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_video ON feedback(video_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- ============================================
-- 7. EVAL_RUNS TABLE (LLM-as-Judge scores)
-- ============================================

CREATE TABLE eval_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
    depth_level INTEGER NOT NULL,
    trace_id VARCHAR(100),
    
    -- Evaluation scores (0-10 scale)
    relevance_score FLOAT,
    video_quality_score FLOAT,
    simplicity_score FLOAT,
    progressiveness_score FLOAT,
    overall_score FLOAT,
    
    -- Evaluation metadata
    evaluator_model VARCHAR(100),
    evaluation_latency_ms FLOAT,
    raw_feedback JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_eval_runs_plan ON eval_runs(plan_id);
CREATE INDEX idx_eval_runs_depth ON eval_runs(plan_id, depth_level);
CREATE INDEX idx_eval_runs_created ON eval_runs(created_at DESC);

-- ============================================
-- 8. PROMPT_VERSIONS TABLE (for Opik experiments)
-- ============================================

CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    performance_score FLOAT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique version per prompt
    UNIQUE(prompt_name, version)
);

CREATE INDEX idx_prompt_versions_name ON prompt_versions(prompt_name);
CREATE INDEX idx_prompt_versions_active ON prompt_versions(prompt_name, is_active);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Observability metrics summary
CREATE OR REPLACE VIEW v_observability_summary AS
SELECT 
    COUNT(DISTINCT er.plan_id) AS total_plans_evaluated,
    COUNT(er.id) AS total_eval_runs,
    ROUND(AVG(er.relevance_score)::numeric, 2) AS avg_relevance,
    ROUND(AVG(er.video_quality_score)::numeric, 2) AS avg_video_quality,
    ROUND(AVG(er.simplicity_score)::numeric, 2) AS avg_simplicity,
    ROUND(AVG(er.progressiveness_score)::numeric, 2) AS avg_progressiveness,
    ROUND(AVG(er.overall_score)::numeric, 2) AS avg_overall,
    ROUND(AVG(er.evaluation_latency_ms)::numeric, 2) AS avg_eval_latency_ms
FROM eval_runs er;

-- View: Feedback summary
CREATE OR REPLACE VIEW v_feedback_summary AS
SELECT 
    COUNT(*) AS total_feedback,
    COUNT(*) FILTER (WHERE rating = 'up') AS thumbs_up,
    COUNT(*) FILTER (WHERE rating = 'down') AS thumbs_down,
    ROUND(
        (COUNT(*) FILTER (WHERE rating = 'up')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 
        2
    ) AS approval_rate
FROM feedback;

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all for service role (API backend)
CREATE POLICY "Service full access users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access plans" ON learning_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access steps" ON roadmap_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access videos" ON videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access progress" ON progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access evals" ON eval_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access prompts" ON prompt_versions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_learning_plans_updated
    BEFORE UPDATE ON learning_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_progress_updated
    BEFORE UPDATE ON progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA (Anonymous user for testing)
-- ============================================

INSERT INTO users (id, email, display_name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'anonymous@naviya.ai', 'Anonymous User')
ON CONFLICT (id) DO NOTHING;
