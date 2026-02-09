# Resume Feature Integration Steps

## ✅ Completed
- [x] Created `backend/data/03_resume.sql` schema
- [x] Created `backend/app/routes/resume_simple.py` endpoint
- [x] Created `backend/data/RESUME_SETUP.md` documentation
- [x] Added import to `main.py`: `from app.routes.resume_simple import router as resume_simple_router`
- [x] Registered router in `main.py`: `app.include_router(resume_simple_router, prefix="/api")`

## ⏳ Remaining Steps

### 1. Install Python Dependencies
**Required libraries:** `pdfplumber` (PDF parsing) and `python-docx` (DOCX parsing)

Run one of these commands in your backend directory:
```powershell
# Option 1: Using pip
pip install pdfplumber python-docx

# Option 2: Using python directly
python -m pip install pdfplumber python-docx

# Option 3: If you have a virtual environment active
.\venv\Scripts\activate
pip install pdfplumber python-docx
```

**Verify installation:**
```powershell
python -c "import pdfplumber; import docx; print('✅ Dependencies installed successfully')"
```

### 2. Run Database Schema in Supabase
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/egxrrifmgmvvdcoucdjj
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **+ New Query**
4. Copy and paste entire contents of: `backend/data/03_resume.sql`
5. Click: **Run** (or press Ctrl+Enter)
6. Verify success message: "Success. No rows returned"

**Verify table creation:**
- Go to **Table Editor** → You should see `resume_data` table
- Check columns: id, user_id, full_name, email, phone, skills, experience, projects, achievements, raw_text, total_skills, created_at, updated_at

### 3. Restart Backend Server
```powershell
# Stop current server (Ctrl+C in terminal)
# Then restart:
cd c:\Users\chuda\OneDrive\Desktop\NAVIYA\NAVIYA_testing\backend
.\start_server.bat
```

### 4. Test Resume Upload Endpoint

**Test with Postman/Thunder Client:**
```
POST http://localhost:8000/api/resume-simple/upload
Content-Type: multipart/form-data

Fields:
- user_id: <your_test_user_id>
- file: <select a PDF or DOCX resume file>
```

**Expected Response:**
```json
{
  "message": "Resume uploaded and processed successfully",
  "extracted_data": {
    "full_name": "John Doe",
    "skills": ["Python", "React", "Docker", "AWS"],
    "total_skills": 4
  }
}
```

**Test Get Resume Data:**
```
GET http://localhost:8000/api/resume-simple/data/{user_id}
```

### 5. Create Frontend Profile Sidebar Component

**Location:** `frontend/src/components/ProfileSidebar.jsx`

**Features to implement:**
- Display user's full name
- Show skills as colorful badges/tags
- Display total skills count
- Show experience count (if any)
- Show projects count (if any)
- Button to upload/update resume

**API Integration:**
```javascript
// Fetch resume data
const response = await fetch(`http://localhost:8000/api/resume-simple/data/${userId}`);
const data = await response.json();

// data.skills = ["Python", "React", "Docker", ...]
// data.full_name = "John Doe"
// data.total_skills = 12
```

**Skills Detected:**
Python, Java, JavaScript, TypeScript, C++, C#, Ruby, Go, Rust, PHP, React, Angular, Vue, Node.js, Django, Flask, Spring, MySQL, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Azure, GCP, Git, Terraform, Jenkins, TensorFlow, PyTorch

## Next Features to Build
After resume feature is working, we can add:
- Learning plans schema
- Roadmap generation schema
- Skill assessments schema
- Mentor chat history schema

## Troubleshooting

**Error: "Module not found: pdfplumber"**
→ Dependencies not installed. Run Step 1 again.

**Error: "relation 'resume_data' does not exist"**
→ Schema not run in Supabase. Complete Step 2.

**Error: "500 Internal Server Error"**
→ Check backend logs. Likely missing dependencies or wrong Supabase key.

**Skills not being extracted:**
→ The resume must contain technical skills from our predefined list (see RESUME_SETUP.md)
→ Try a different resume or expand the skills list in `resume_simple.py`

## Questions?
- Check `backend/data/RESUME_SETUP.md` for detailed documentation
- Review `backend/app/routes/resume_simple.py` for implementation details
- Test with sample technical resume PDFs first
