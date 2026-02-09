-- ============================================
-- Migration: Add LLM-extracted data columns to resume_data
-- Run this on an existing database to add the new columns
-- ============================================

-- Add location column
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS location TEXT;

-- Add social_links JSONB column (linkedin, github, portfolio, twitter etc.)
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Add llm_extracted_data JSONB column (full Gemini LLM response)
ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS llm_extracted_data JSONB DEFAULT '{}'::jsonb;

-- Update status check constraint to allow 'uploaded' as initial state
-- (safe: drops and re-adds the constraint)
ALTER TABLE resume_data DROP CONSTRAINT IF EXISTS resume_data_status_check;
ALTER TABLE resume_data ADD CONSTRAINT resume_data_status_check 
    CHECK (status IN ('uploaded', 'parsing', 'parsed', 'analyzed', 'failed'));

DO $$
BEGIN
    RAISE NOTICE '✅ Resume LLM migration complete — added location, social_links, llm_extracted_data columns';
END $$;
