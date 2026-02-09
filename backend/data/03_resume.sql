-- ============================================
-- NAVIYA - Resume & Career Intelligence Schema
-- Resume data + AI agent analysis tables
-- Run AFTER 02_onboarding.sql
-- ============================================

-- ============================================
-- Table: resume_data
-- Stores raw extracted resume information
-- All extraction is done by Gemini LLM at upload time
-- ============================================
CREATE TABLE IF NOT EXISTS resume_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Extracted Information (LLM-extracted)
    full_name TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    
    -- Social Links (editable if not found by LLM)
    social_links JSONB DEFAULT '{}'::jsonb,
    -- Structure: { "linkedin": "", "github": "", "portfolio": "", "twitter": "", "other": [] }
    
    -- LLM-extracted structured data (full Gemini response)
    llm_extracted_data JSONB DEFAULT '{}'::jsonb,
    -- Contains: skills (categorized), experience, projects, education, certifications, etc.
    
    -- Flat skills list (for quick access / backward compat)
    skills JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Original Resume
    raw_text TEXT,
    file_name TEXT,
    file_size_bytes INTEGER,
    
    -- Stats
    total_skills INTEGER DEFAULT 0,
    years_of_experience FLOAT DEFAULT 0,
    
    -- Processing Status
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'analyzed', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parsed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT resume_data_unique_user UNIQUE(user_id)
);

-- ============================================
-- Table: resume_analysis
-- Stores AI agent deep analysis results
-- ============================================
CREATE TABLE IF NOT EXISTS resume_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID,
    
    -- Domain (tech / medical)
    domain TEXT NOT NULL DEFAULT 'tech',
    
    -- AI-extracted structured data (skills by category, projects, experience, education)
    extracted_data JSONB DEFAULT '{}'::jsonb,
    
    -- Quality scores from AI (skill_clarity, project_depth, ats_readiness etc.)
    quality_scores JSONB DEFAULT '{}'::jsonb,
    
    -- What's missing from the resume
    missing_elements JSONB DEFAULT '[]'::jsonb,
    
    -- AI recommendations to improve
    recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Overall resume score 0-100
    overall_score INTEGER DEFAULT 0,
    
    -- Confidence level: low / medium / high
    confidence_level TEXT DEFAULT 'medium',
    
    -- Resume metadata
    resume_filename TEXT,
    word_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT resume_analysis_unique_user UNIQUE(user_id)
);

-- ============================================
-- Table: user_skills
-- Individual skills extracted by AI agent
-- ============================================
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Skill info
    skill_name TEXT NOT NULL,
    skill_category TEXT DEFAULT 'other',
    skill_level TEXT DEFAULT 'intermediate',
    domain TEXT DEFAULT 'tech',
    source TEXT DEFAULT 'resume',
    verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_skills_unique UNIQUE(user_id, skill_name)
);

-- ============================================
-- Table: agent_activity_log
-- Logs all agent actions for observability
-- ============================================
CREATE TABLE IF NOT EXISTS agent_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resume_data_user_id ON resume_data(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_data_status ON resume_data(status);
CREATE INDEX IF NOT EXISTS idx_resume_analysis_user_id ON resume_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_category ON user_skills(skill_category);
CREATE INDEX IF NOT EXISTS idx_agent_activity_user_id ON agent_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_data_skills ON resume_data USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_resume_analysis_extracted ON resume_analysis USING GIN (extracted_data);

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_resume_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_resume_data_updated_at ON resume_data;
CREATE TRIGGER trigger_resume_data_updated_at
    BEFORE UPDATE ON resume_data
    FOR EACH ROW
    EXECUTE FUNCTION update_resume_updated_at();

DROP TRIGGER IF EXISTS trigger_resume_analysis_updated_at ON resume_analysis;
CREATE TRIGGER trigger_resume_analysis_updated_at
    BEFORE UPDATE ON resume_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_resume_updated_at();

CREATE OR REPLACE FUNCTION calculate_resume_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.skills IS NOT NULL THEN
        NEW.total_skills = jsonb_array_length(NEW.skills);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_resume_stats ON resume_data;
CREATE TRIGGER trigger_calculate_resume_stats
    BEFORE INSERT OR UPDATE ON resume_data
    FOR EACH ROW
    EXECUTE FUNCTION calculate_resume_stats();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE resume_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on resume_data" ON resume_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on resume_analysis" ON resume_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_skills" ON user_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_activity_log" ON agent_activity_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Success
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Resume & Career Intelligence schema created';
    RAISE NOTICE '📄 Tables: resume_data, resume_analysis, user_skills, agent_activity_log';
END $$;
