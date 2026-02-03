# Document Ingestion System

## Overview

The Document Ingestion System is an agent-agnostic service for extracting text from uploaded resume documents. It runs **BEFORE** the ResumeIntelligenceAgent and supports multiple file formats including PDF, DOCX, DOC, TXT, and images (OCR).

## Architecture

```
User uploads file
       ↓
[DocumentIngestionService]
       ↓
  ┌─────────────────────┐
  │  Validate File      │
  │  - Extension check  │
  │  - MIME type check  │
  │  - Size check       │
  └─────────────────────┘
       ↓
  ┌─────────────────────┐
  │  Extract Text       │
  │  - PDF (PyMuPDF)    │
  │  - DOCX (python-docx)│
  │  - DOC (textract)   │
  │  - TXT (direct)     │
  │  - Image (OCR)      │
  └─────────────────────┘
       ↓
  ┌─────────────────────┐
  │  Normalize Text     │
  │  - Clean whitespace │
  │  - Fix bullets      │
  │  - Merge lines      │
  │  - Remove headers   │
  └─────────────────────┘
       ↓
  ┌─────────────────────┐
  │  Store in DB        │
  │  (resume_documents) │
  └─────────────────────┘
       ↓
[ResumeIntelligenceAgent]
```

## Supported File Types

| Extension | MIME Type | Extraction Method | Notes |
|-----------|-----------|-------------------|-------|
| `.pdf` | `application/pdf` | PyMuPDF / pdfplumber | Falls back to OCR if image-based |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | python-docx | Extracts paragraphs and tables |
| `.doc` | `application/msword` | textract / antiword | Legacy Word format |
| `.txt` | `text/plain` | Direct read | Multiple encoding support |
| `.png` | `image/png` | Tesseract OCR | Requires preprocessing |
| `.jpg/.jpeg` | `image/jpeg` | Tesseract OCR | Requires preprocessing |

## Rejected File Types

For security, the following are blocked:
- `.zip`
- `.exe`
- `.bat`, `.cmd`, `.sh`
- `.html`, `.htm`
- `.js`, `.py`

## API Endpoints

### POST `/api/resume/upload-file/{user_id}`

Upload a resume file for extraction and analysis.

**Request:**
```
Content-Type: multipart/form-data
Body: file (required)
```

**Response:**
```json
{
  "success": true,
  "message": "Resume uploaded and processing started",
  "document_id": "uuid",
  "task_id": "uuid",
  "extraction": {
    "method": "pdf_pymupdf",
    "confidence": "high",
    "word_count": 450,
    "page_count": 2
  },
  "status": "processing",
  "warnings": []
}
```

**Error Response:**
```json
{
  "detail": "We couldn't read your resume. Please upload a clearer file."
}
```

## Database Schema

### `resume_documents` Table

```sql
CREATE TABLE resume_documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    mime_type TEXT,
    extracted_text TEXT,
    extraction_method TEXT,
    extraction_confidence TEXT, -- 'high', 'medium', 'low'
    status TEXT, -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    page_count INTEGER,
    word_count INTEGER,
    warnings JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## Confidence Levels

| Level | Description | When Applied |
|-------|-------------|--------------|
| `high` | Clean text extraction | PDF with selectable text, DOCX, TXT |
| `medium` | Some uncertainty | OCR with good quality image |
| `low` | Possible inaccuracies | OCR with poor quality, format issues |

## Integration with ResumeIntelligenceAgent

The agent receives:
- `resume_text`: Extracted and normalized text
- `extraction_confidence`: Quality indicator

When `extraction_confidence == "low"`:
1. Agent lowers overall `confidence_level`
2. Adds warning to recommendations
3. Reduces `overall_resume_score` by 5 points
4. Notes possible missing information

## Text Normalization

The service performs these normalization steps:
1. Remove non-printable characters
2. Normalize Unicode (NFKC)
3. Standardize bullet points to `•`
4. Collapse multiple spaces
5. Merge broken lines (mid-sentence line breaks)
6. Remove common headers/footers (page numbers)
7. Strip leading/trailing whitespace

## OCR Preprocessing

For image-based documents:
1. Convert to grayscale
2. Increase contrast (1.5x)
3. Increase sharpness (1.5x)
4. Apply median filter (noise reduction)
5. Run Tesseract with English language

## Dependencies

```
# requirements.txt
PyMuPDF>=1.23.0
pdfplumber>=0.10.0
python-docx>=1.0.0
pytesseract>=0.3.10
Pillow>=10.0.0
```

**System Requirements:**
- Tesseract OCR must be installed for image extraction
  - Windows: `choco install tesseract`
  - macOS: `brew install tesseract`
  - Ubuntu: `apt install tesseract-ocr`

## Usage Example

```python
from app.services.document_ingestion import get_document_ingestion_service

service = get_document_ingestion_service()

# Extract text from file
result = await service.extract_text(
    file_content=file_bytes,
    filename="resume.pdf",
    mime_type="application/pdf"
)

if result.success:
    print(f"Extracted {result.word_count} words")
    print(f"Confidence: {result.confidence}")
    print(f"Method: {result.method}")
    print(result.text[:500])
else:
    print(f"Error: {result.error}")
```

## Error Handling

| Error | User Message |
|-------|--------------|
| Unsupported file type | "Please upload PDF, DOCX, DOC, TXT, or image files." |
| File too large | "File too large. Maximum size is 10MB." |
| Empty file | "File is empty." |
| PDF is image-based, OCR fails | "PDF appears to be scanned. Please upload a text-based PDF." |
| Text too short | "Extracted text is too short. Please upload a more detailed resume." |
| General error | "We couldn't read your resume. Please upload a clearer file." |

## Testing

Test cases to verify:
1. ✅ Text-based PDF resume
2. ✅ Image-based scanned PDF (OCR)
3. ✅ DOCX resume
4. ✅ Poor-quality image resume (low confidence)
5. ✅ Large resume file (10MB limit)
6. ✅ Corrupted/unreadable file
7. ✅ Rejected file types (.exe, .zip)
