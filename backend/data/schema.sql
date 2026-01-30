-- ============================================
-- LearnTube AI - Supabase SQL Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: learning_plans
-- Stores user learning plans
-- ============================================
CREATE TABLE IF NOT EXISTS learning_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,  -- Can be NULL for anonymous users
    topic TEXT NOT NULL,
    roadmap JSONB DEFAULT '[]'::jsonb,  -- Array of subtopics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_created_at ON learning_plans(created_at DESC);

-- ============================================
-- Table: videos
-- Stores videos associated with learning plans
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES learning_plans(id) ON DELETE CASCADE,
    subtopic TEXT NOT NULL,
    video_id TEXT,  -- YouTube video ID
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    channel TEXT,
    duration TEXT,
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    quality_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster plan queries
CREATE INDEX IF NOT EXISTS idx_videos_plan_id ON videos(plan_id);
CREATE INDEX IF NOT EXISTS idx_videos_subtopic ON videos(subtopic);

-- ============================================
-- Table: progress
-- Tracks user progress on videos
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('saved', 'watched')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user-video combination
    UNIQUE(user_id, video_id)
);

-- Index for faster progress queries
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_video_id ON progress(video_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Allow all for service role
-- (Customize these for production with auth)
-- ============================================

-- Learning Plans: Allow all operations
CREATE POLICY "Allow all operations on learning_plans" ON learning_plans
    FOR ALL USING (true) WITH CHECK (true);

-- Videos: Allow all operations  
CREATE POLICY "Allow all operations on videos" ON videos
    FOR ALL USING (true) WITH CHECK (true);

-- Progress: Allow all operations
CREATE POLICY "Allow all operations on progress" ON progress
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Function to auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_learning_plans_updated_at
    BEFORE UPDATE ON learning_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
    BEFORE UPDATE ON progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample data (optional - for testing)
-- ============================================
-- INSERT INTO learning_plans (user_id, topic, roadmap) 
-- VALUES ('test_user', 'Graph Algorithms', '["BFS", "DFS", "Dijkstra"]');
