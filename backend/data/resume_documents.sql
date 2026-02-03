-- ============================================
-- Resume Documents Table
-- ============================================
-- Stores extracted text from uploaded resume documents.
-- Separate from resume_analysis to track document ingestion.

CREATE TABLE IF NOT EXISTS resume_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File metadata
    original_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
    mime_type TEXT,
    
    -- Extraction results
    extracted_text TEXT,
    extraction_method TEXT, -- pdf_pymupdf, pdf_pdfplumber, docx, doc_textract, txt, image_ocr, pdf_ocr
    extraction_confidence TEXT CHECK (extraction_confidence IN ('high', 'medium', 'low')),
    
    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Metadata
    page_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint: one document per user at a time (or keep history)
    -- Uncomment below if you want to keep only latest document per user
    -- UNIQUE (user_id)
    
    -- Index on user_id for fast lookups
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resume_documents_user_id ON resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_documents_status ON resume_documents(status);
CREATE INDEX IF NOT EXISTS idx_resume_documents_file_hash ON resume_documents(file_hash);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_resume_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resume_documents_updated_at
    BEFORE UPDATE ON resume_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_resume_documents_updated_at();

-- RLS Policies
ALTER TABLE resume_documents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users can view own resume documents"
    ON resume_documents FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own resume documents"
    ON resume_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own resume documents"
    ON resume_documents FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can do anything (for backend)
CREATE POLICY "Service role full access"
    ON resume_documents
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- Helper Function: Get latest document for user
-- ============================================
CREATE OR REPLACE FUNCTION get_latest_resume_document(p_user_id UUID)
RETURNS resume_documents AS $$
    SELECT * FROM resume_documents
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Helper Function: Upsert resume document
-- ============================================
CREATE OR REPLACE FUNCTION upsert_resume_document(
    p_user_id UUID,
    p_original_filename TEXT,
    p_file_extension TEXT,
    p_file_size INTEGER,
    p_file_hash TEXT,
    p_mime_type TEXT DEFAULT NULL,
    p_extracted_text TEXT DEFAULT NULL,
    p_extraction_method TEXT DEFAULT NULL,
    p_extraction_confidence TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'pending',
    p_error_message TEXT DEFAULT NULL,
    p_page_count INTEGER DEFAULT 0,
    p_word_count INTEGER DEFAULT 0,
    p_warnings JSONB DEFAULT '[]'::jsonb
)
RETURNS resume_documents AS $$
DECLARE
    v_result resume_documents;
BEGIN
    INSERT INTO resume_documents (
        user_id,
        original_filename,
        file_extension,
        file_size,
        file_hash,
        mime_type,
        extracted_text,
        extraction_method,
        extraction_confidence,
        status,
        error_message,
        page_count,
        word_count,
        warnings
    ) VALUES (
        p_user_id,
        p_original_filename,
        p_file_extension,
        p_file_size,
        p_file_hash,
        p_mime_type,
        p_extracted_text,
        p_extraction_method,
        p_extraction_confidence,
        p_status,
        p_error_message,
        p_page_count,
        p_word_count,
        p_warnings
    )
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
