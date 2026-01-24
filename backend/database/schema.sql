-- Create learning_sessions table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    current_mission TEXT,
    eta_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (will be refined with auth later)
CREATE POLICY "Allow all operations on learning_sessions" 
ON learning_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_sessions_created_at 
ON learning_sessions(created_at DESC);
