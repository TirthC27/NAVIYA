-- ============================================
-- skill_assessment table
-- Stores scenario-based skill assessment attempts
-- Run this in Supabase SQL Editor
-- ============================================

DROP TABLE IF EXISTS public.skill_assessment;

CREATE TABLE public.skill_assessment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,               -- tech / business / law
  skill TEXT NOT NULL,                 -- e.g. "decision-making under pressure"
  scenario_id TEXT NOT NULL,
  scenario_data JSONB NOT NULL DEFAULT '{}',
  user_actions JSONB NOT NULL DEFAULT '[]',
  user_explanation TEXT,
  scores JSONB NOT NULL DEFAULT '{}',
  total_score NUMERIC(5,2) DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_assessment_user ON public.skill_assessment(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessment_domain ON public.skill_assessment(user_id, domain);

-- Enable RLS
ALTER TABLE public.skill_assessment ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all for service role" ON public.skill_assessment
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users read own" ON public.skill_assessment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own" ON public.skill_assessment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own" ON public.skill_assessment
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
