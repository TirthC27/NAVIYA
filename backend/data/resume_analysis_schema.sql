-- ============================================
-- NAVIYA - ResumeIntelligenceAgent Schema
-- Resume Analysis Storage
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP existing tables (for fresh install)
-- ============================================
DROP TABLE IF EXISTS resume_analysis CASCADE;
DROP TYPE IF EXISTS analysis_confidence_level CASCADE;

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE analysis_confidence_level AS ENUM ('low', 'medium', 'high');

-- ============================================
-- RESUME_ANALYSIS TABLE
-- Output table for ResumeIntelligenceAgent
-- ============================================

CREATE TABLE resume_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    
    -- Domain classification
    domain TEXT NOT NULL CHECK (domain IN ('tech', 'medical')),
    
    -- Extracted structured data
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Quality assessment
    quality_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Gap analysis
    missing_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Recommendations
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Overall metrics
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    confidence_level analysis_confidence_level NOT NULL DEFAULT 'medium',
    
    -- Resume metadata
    resume_filename TEXT,
    resume_hash TEXT,  -- For duplicate detection
    word_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one analysis per user (latest wins)
    CONSTRAINT unique_user_analysis UNIQUE (user_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_resume_analysis_user ON resume_analysis(user_id);
CREATE INDEX idx_resume_analysis_domain ON resume_analysis(domain);
CREATE INDEX idx_resume_analysis_score ON resume_analysis(overall_score);
CREATE INDEX idx_resume_analysis_created ON resume_analysis(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_resume_analysis_extracted ON resume_analysis USING GIN (extracted_data);
CREATE INDEX idx_resume_analysis_missing ON resume_analysis USING GIN (missing_elements);

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

ALTER TABLE resume_analysis ENABLE ROW LEVEL SECURITY;

-- Users can view their own analysis
CREATE POLICY "Users can view own resume analysis"
    ON resume_analysis FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Service role can insert/update
CREATE POLICY "Service role can insert resume analysis"
    ON resume_analysis FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update resume analysis"
    ON resume_analysis FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ============================================
-- USER_SKILLS TABLE
-- Extracted skills for quick lookup
-- ============================================

DROP TABLE IF EXISTS user_skills CASCADE;

CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    skill_category TEXT NOT NULL,  -- 'language', 'framework', 'tool', 'database', 'cloud', 'soft_skill', 'clinical', 'certification'
    proficiency_level TEXT,  -- 'beginner', 'intermediate', 'advanced', 'expert' or NULL
    source TEXT DEFAULT 'resume',  -- 'resume', 'self_assessed', 'verified'
    domain TEXT NOT NULL CHECK (domain IN ('tech', 'medical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name, skill_category)
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_category ON user_skills(skill_category);
CREATE INDEX idx_user_skills_domain ON user_skills(domain);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
    ON user_skills FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Service role can manage skills"
    ON user_skills FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Views for Common Queries
-- ============================================

-- Tech skills summary view
CREATE OR REPLACE VIEW v_tech_skills_summary AS
SELECT 
    user_id,
    skill_category,
    array_agg(skill_name ORDER BY skill_name) as skills,
    COUNT(*) as skill_count
FROM user_skills
WHERE domain = 'tech'
GROUP BY user_id, skill_category;

-- Medical skills summary view
CREATE OR REPLACE VIEW v_medical_skills_summary AS
SELECT 
    user_id,
    skill_category,
    array_agg(skill_name ORDER BY skill_name) as skills,
    COUNT(*) as skill_count
FROM user_skills
WHERE domain = 'medical'
GROUP BY user_id, skill_category;

-- Resume score breakdown view
CREATE OR REPLACE VIEW v_resume_score_breakdown AS
SELECT 
    ra.user_id,
    ra.domain,
    ra.overall_score,
    ra.confidence_level,
    ra.quality_scores->>'skill_clarity_score' as skill_clarity_score,
    ra.quality_scores->>'project_depth_score' as project_depth_score,
    ra.quality_scores->>'ats_readiness_score' as ats_readiness_score,
    ra.quality_scores->>'cv_completeness_score' as cv_completeness_score,
    ra.quality_scores->>'clinical_exposure_score' as clinical_exposure_score,
    ra.quality_scores->>'track_alignment_score' as track_alignment_score,
    jsonb_array_length(ra.missing_elements) as missing_element_count,
    ra.created_at
FROM resume_analysis ra;

-- ============================================
-- Functions
-- ============================================

-- Function to upsert resume analysis (replace if exists)
CREATE OR REPLACE FUNCTION upsert_resume_analysis(
    p_user_id UUID,
    p_task_id UUID,
    p_domain TEXT,
    p_extracted_data JSONB,
    p_quality_scores JSONB,
    p_missing_elements JSONB,
    p_recommendations JSONB,
    p_overall_score INTEGER,
    p_confidence_level analysis_confidence_level,
    p_resume_filename TEXT DEFAULT NULL,
    p_word_count INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO resume_analysis (
        user_id, task_id, domain, extracted_data, quality_scores,
        missing_elements, recommendations, overall_score, confidence_level,
        resume_filename, word_count
    )
    VALUES (
        p_user_id, p_task_id, p_domain, p_extracted_data, p_quality_scores,
        p_missing_elements, p_recommendations, p_overall_score, p_confidence_level,
        p_resume_filename, p_word_count
    )
    ON CONFLICT (user_id) DO UPDATE SET
        task_id = EXCLUDED.task_id,
        domain = EXCLUDED.domain,
        extracted_data = EXCLUDED.extracted_data,
        quality_scores = EXCLUDED.quality_scores,
        missing_elements = EXCLUDED.missing_elements,
        recommendations = EXCLUDED.recommendations,
        overall_score = EXCLUDED.overall_score,
        confidence_level = EXCLUDED.confidence_level,
        resume_filename = EXCLUDED.resume_filename,
        word_count = EXCLUDED.word_count,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to sync skills from analysis
CREATE OR REPLACE FUNCTION sync_user_skills(
    p_user_id UUID,
    p_domain TEXT,
    p_skills JSONB  -- Array of {name, category, proficiency}
)
RETURNS INTEGER AS $$
DECLARE
    v_skill JSONB;
    v_count INTEGER := 0;
BEGIN
    -- Clear existing resume-sourced skills for user
    DELETE FROM user_skills 
    WHERE user_id = p_user_id AND source = 'resume';
    
    -- Insert new skills
    FOR v_skill IN SELECT * FROM jsonb_array_elements(p_skills)
    LOOP
        INSERT INTO user_skills (user_id, skill_name, skill_category, proficiency_level, domain, source)
        VALUES (
            p_user_id,
            v_skill->>'name',
            v_skill->>'category',
            v_skill->>'proficiency',
            p_domain,
            'resume'
        )
        ON CONFLICT (user_id, skill_name, skill_category) DO UPDATE
        SET proficiency_level = EXCLUDED.proficiency_level,
            source = 'resume';
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
