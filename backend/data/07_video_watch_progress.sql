-- ============================================
-- Video Watch Progress Table
-- Tracks how much of each tutorial video
-- a user has watched in their career roadmap.
-- Completion is automatic: watched >= full duration (countdown timer)
-- ============================================

CREATE TABLE IF NOT EXISTS video_watch_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  roadmap_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id, node_id, video_id)
);

-- Enable RLS
ALTER TABLE video_watch_progress ENABLE ROW LEVEL SECURITY;

-- Allow all operations (service role key used by backend)
CREATE POLICY "Allow all video progress operations"
  ON video_watch_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_progress_user_roadmap
  ON video_watch_progress(user_id, roadmap_id);
