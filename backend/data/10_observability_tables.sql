-- ============================================
-- 10. Observability & Metrics Tables
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. eval_runs — stores evaluation run results
CREATE TABLE IF NOT EXISTS eval_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    relevance_score FLOAT,
    video_quality_score FLOAT,
    simplicity_score FLOAT,
    progressiveness_score FLOAT,
    overall_score FLOAT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own eval runs" ON eval_runs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access eval_runs" ON eval_runs
    FOR ALL USING (auth.role() = 'service_role');

-- 2. feedback — thumbs up/down on videos/content
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID,
    rating TEXT CHECK (rating IN ('up', 'down')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feedback" ON feedback
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access feedback" ON feedback
    FOR ALL USING (auth.role() = 'service_role');

-- 3. learning_plans — generated learning plans
CREATE TABLE IF NOT EXISTS learning_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    learning_mode TEXT DEFAULT 'structured',
    plan_data JSONB DEFAULT '{}',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own learning plans" ON learning_plans
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access learning_plans" ON learning_plans
    FOR ALL USING (auth.role() = 'service_role');

-- 4. prompt_versions — track prompt version history for experiments
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    prompt_text TEXT NOT NULL,
    model TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access prompt_versions" ON prompt_versions
    FOR ALL USING (auth.role() = 'service_role');

-- 5. agent_activity_log (if not already exists from 03_resume.sql)
CREATE TABLE IF NOT EXISTS agent_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access agent_activity_log" ON agent_activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_eval_runs_user_id ON eval_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_created_at ON eval_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_created_at ON learning_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_name ON prompt_versions(prompt_name);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_user ON agent_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created ON agent_activity_log(created_at DESC);
