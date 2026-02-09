-- ============================================
-- User Activity Log Table
-- Tracks time spent (in seconds) per feature per day.
-- Frontend heartbeats every 30s while the user
-- is active on a page; backend upserts the row.
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,          -- 'resume', 'roadmap', 'skills', 'interview', 'alumni', 'dashboard'
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature, activity_date)
);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations (service role key used by backend)
CREATE POLICY "Allow all activity log operations"
  ON user_activity_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast weekly lookups
CREATE INDEX IF NOT EXISTS idx_activity_user_date
  ON user_activity_log(user_id, activity_date DESC);
