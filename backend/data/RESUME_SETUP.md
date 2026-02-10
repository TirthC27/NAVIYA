# 📄 Resume Upload - Simple Setup

## What This Creates

A simple technical resume parser that:
- ✅ Uploads PDF/DOCX files
- ✅ Extracts name and skills
- ✅ Stores in database
- ✅ Displays extracted skills immediately

## Database Table: `resume_data`

Stores technical resume information per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated ID |
| `user_id` | UUID | References users table (UNIQUE) |
| `full_name` | TEXT | Extracted name |
| `email` | TEXT | Extracted email |
| `phone` | TEXT | Extracted phone |
| `skills` | JSONB | Array of skill strings |
| `experience` | JSONB | Array of experience objects |
| `projects` | JSONB | Array of project objects |
| `achievements` | JSONB | Array of achievements |
| `raw_text` | TEXT | Full extracted text |
| `file_name` | TEXT | Original filename |
| `file_size_bytes` | INTEGER | File size |
| `total_skills` | INTEGER | Auto-calculated skill count |
| `status` | TEXT | uploaded/parsing/parsed/failed |
| `uploaded_at` | TIMESTAMP | When uploaded |
| `parsed_at` | TIMESTAMP | When parsed (auto-set) |
| `updated_at` | TIMESTAMP | Last updated (auto) |

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
pip install pdfplumber python-docx
```

### 2. Run SQL in Supabase

1. Go to Supabase SQL Editor
2. Copy contents of `backend/data/03_resume.sql`
3. Paste and click **Run**
4. Look for: `✅ Resume schema created successfully`

### 3. Register Route in main.py

Add this to `backend/app/main.py`:

```python
from app.routes import resume_simple

app.include_router(resume_simple.router)
```

### 4. Restart Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST `/api/resume-simple/upload?user_id={uuid}`
Upload resume file

**Request:**
- Content-Type: multipart/form-data
- Body: file (PDF or DOCX)

**Response:**
```json
{
  "success": true,
  "name": "John Doe",
  "skills": ["Python", "React", "Docker", "AWS"],
  "skills_count": 4
}
```

### GET `/api/resume-simple/data/{user_id}`
Get stored resume data

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "full_name": "John Doe",
  "skills": ["Python", "React", "Docker"],
  "total_skills": 3,
  "file_name": "resume.pdf",
  "status": "parsed",
  "uploaded_at": "2026-02-08T..."
}
```

## Frontend Usage Example

```javascript
// Upload resume
const formData = new FormData();
formData.append('file', resumeFile);

const response = await fetch(
  `https://naviya-backend.onrender.com/api/resume-simple/upload?user_id=${userId}`,
  {
    method: 'POST',
    body: formData
  }
);

const data = await response.json();
console.log(`Found ${data.skills_count} skills:`, data.skills);

// Display skills in UI
setExtractedSkills(data.skills);
```

## Technical Skills Detected

The system can detect 25+ common technical skills:

**Languages:** Python, Java, JavaScript, TypeScript, C++, C, C#

**Frameworks:** React, Angular, Vue, Node, Django, Flask, FastAPI

**Databases:** MySQL, PostgreSQL, MongoDB, Redis

**DevOps:** Docker, Kubernetes, AWS, Azure, GCP

**Tools:** Git, Linux, TensorFlow, PyTorch

**Web:** HTML, CSS

## Features

✅ **Auto-Extract** - Automatically finds skills in resume text  
✅ **Upsert Logic** - Updates existing resume or creates new  
✅ **Auto-Calculate** - Automatically counts total skills  
✅ **Simple Response** - Returns skills immediately after upload  
✅ **One Per User** - Unique constraint ensures one resume per user  

## For Profile Sidebar

Show resume data in a profile section:

```javascript
// Fetch resume data
const resumeData = await fetch(`/api/resume-simple/data/${userId}`);

// Display in sidebar
<div className="profile-section">
  <h3>{resumeData.full_name}</h3>
  <div className="skills">
    {resumeData.skills.map(skill => (
      <span key={skill} className="skill-badge">{skill}</span>
    ))}
  </div>
  <p>{resumeData.total_skills} skills found</p>
</div>
```

## Next Steps

1. ✅ Run SQL to create `resume_data` table
2. ✅ Install dependencies (pdfplumber, python-docx)
3. ✅ Add route to main.py
4. ✅ Restart backend
5. 🔜 Create frontend upload component
6. 🔜 Add profile section to sidebar
7. 🔜 Display extracted skills

---

**Status:** ✅ Ready to use  
**Table:** resume_data  
**Endpoints:** 2 (upload, get data)  
**Skills Detected:** 25+ technical skills
