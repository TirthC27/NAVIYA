-- ============================================
-- Quick Dashboard State Table Setup
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_state (
    user_id UUID PRIMARY KEY,
    current_phase TEXT DEFAULT 'onboarding',
    resume_ready BOOLEAN DEFAULT FALSE,
    roadmap_ready BOOLEAN DEFAULT FALSE,
    skill_eval_ready BOOLEAN DEFAULT FALSE,
    interview_ready BOOLEAN DEFAULT FALSE,
    mentor_ready BOOLEAN DEFAULT TRUE,
    domain TEXT,
    last_updated_by_agent TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_state;

-- Initialize state for existing user (replace with your user_id)
INSERT INTO dashboard_state (user_id, resume_ready)
VALUES ('cded6979-e0c1-41c5-8064-0527612d2544', true)
ON CONFLICT (user_id) DO UPDATE
SET resume_ready = true, updated_at = NOW();
