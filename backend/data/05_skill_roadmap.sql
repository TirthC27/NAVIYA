-- ============================================
-- skill_roadmap table
-- Stores generated career skill roadmaps per user
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old table if it has the wrong FK constraint
DROP TABLE IF EXISTS public.skill_roadmap;

CREATE TABLE public.skill_roadmap (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  career_goal TEXT NOT NULL,
  roadmap_data JSONB NOT NULL DEFAULT '{}',
  preferred_language TEXT DEFAULT 'English',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_skill_roadmap_user_id ON public.skill_roadmap(user_id);

-- Enable RLS
ALTER TABLE public.skill_roadmap ENABLE ROW LEVEL SECURITY;

-- Policies: allow all access via service key
CREATE POLICY "Allow all access for service role" ON public.skill_roadmap
  FOR ALL USING (true) WITH CHECK (true);

-- Users can read their own roadmaps
CREATE POLICY "Users can view own roadmaps" ON public.skill_roadmap
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own roadmaps
CREATE POLICY "Users can insert own roadmaps" ON public.skill_roadmap
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own roadmaps
CREATE POLICY "Users can update own roadmaps" ON public.skill_roadmap
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
