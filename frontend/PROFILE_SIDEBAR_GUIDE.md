# Profile Sidebar Integration Guide

## Component Created
✅ **Location:** `frontend/src/components/ProfileSidebar.jsx`

## Features
- ✅ Resume upload with drag & drop support
- ✅ Auto-extracts: Name, Email, Phone, Skills, Experience, Projects, Achievements
- ✅ Skills displayed as animated badges
- ✅ Works with PDF and DOCX files
- ✅ Real-time updates after upload
- ✅ Responsive design with Tailwind CSS
- ✅ Smooth animations with Framer Motion

## How to Use in Your Pages

### Option 1: Add to Dashboard Layout
```jsx
// In your main dashboard page (e.g., src/pages/Dashboard.jsx)
import ProfileSidebar from '../components/ProfileSidebar';

function Dashboard() {
  const userId = "your_user_id"; // Get from auth context/state

  return (
    <div className="flex h-screen">
      {/* Profile Sidebar */}
      <ProfileSidebar userId={userId} />
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Your existing dashboard content */}
      </div>
    </div>
  );
}
```

### Option 2: Add to Onboarding Flow
```jsx
// In your onboarding page (e.g., src/pages/Onboarding.jsx)
import ProfileSidebar from '../components/ProfileSidebar';

function Onboarding() {
  const userId = "your_user_id";

  return (
    <div className="flex h-screen">
      <ProfileSidebar userId={userId} />
      
      <div className="flex-1">
        {/* Onboarding steps */}
      </div>
    </div>
  );
}
```

### Option 3: Toggle Sidebar (Mobile Friendly)
```jsx
import { useState } from 'react';
import ProfileSidebar from '../components/ProfileSidebar';

function Dashboard() {
  const [showSidebar, setShowSidebar] = useState(true);
  const userId = "your_user_id";

  return (
    <div className="flex h-screen">
      {/* Toggle Button (Mobile) */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="md:hidden fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2 rounded"
      >
        {showSidebar ? '← Hide' : 'Profile →'}
      </button>

      {/* Sidebar */}
      {showSidebar && <ProfileSidebar userId={userId} />}
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Your content */}
      </div>
    </div>
  );
}
```

## API Endpoints Used

### 1. Upload Resume
```
POST /api/resume-simple/upload
Content-Type: multipart/form-data
Body: { user_id, file }
```

### 2. Get Resume Data
```
GET /api/resume-simple/data/{user_id}
Response: { full_name, email, phone, skills[], experience[], projects[], achievements[], total_skills }
```

## Customization

### Change Color Scheme
Edit the Tailwind classes in `ProfileSidebar.jsx`:
```jsx
// Current: Indigo theme
className="bg-indigo-600 text-white"

// Change to Blue
className="bg-blue-600 text-white"

// Change to Purple
className="bg-purple-600 text-white"
```

### Add More Sections
Add new sections after line 100 in `ProfileSidebar.jsx`:
```jsx
{/* Education */}
{resumeData.education && (
  <div>
    <h3 className="text-sm font-semibold text-gray-600 mb-2">Education</h3>
    <p className="text-sm text-gray-700">{resumeData.education}</p>
  </div>
)}
```

### Expand Skills List
Edit `backend/app/routes/resume_simple.py` line 20-50 to add more skills:
```python
skills_to_check = [
    "python", "java", "javascript", 
    # Add your custom skills here:
    "flutter", "kotlin", "swift", "r", "matlab"
]
```

## Testing

### 1. Test Upload with Sample Resume
- Create a sample PDF with text: "John Doe - Python React AWS Developer"
- Upload via the component
- Check if skills are extracted

### 2. Test with Real Resume
- Use your own technical resume
- Verify all sections are displayed correctly
- Check Supabase `resume_data` table for stored data

### 3. Test Error Handling
- Try uploading a non-PDF/DOCX file
- Try uploading without selecting a file
- Check console for error messages

## Next Steps
1. ✅ Install dependencies (`pdfplumber python-docx`)
2. ✅ Run `03_resume.sql` in Supabase
3. ✅ Restart backend server
4. ✅ Test resume upload endpoint
5. ✅ Add `<ProfileSidebar userId={userId} />` to your dashboard
6. ✅ Upload a sample resume and verify display

## Troubleshooting

**Issue:** Skills not showing
- **Solution:** Ensure resume contains technical skills from the predefined list (Python, React, AWS, etc.)

**Issue:** Upload button not working
- **Solution:** Check browser console. Verify backend is running on `http://localhost:8000`

**Issue:** "Resume data not found"
- **Solution:** Upload a resume first. The component shows "No resume uploaded yet" if empty.

**Issue:** Styles not applying
- **Solution:** Ensure Tailwind CSS is configured in your project. Check `tailwind.config.js`

## Support
- Backend route: `backend/app/routes/resume_simple.py`
- Database schema: `backend/data/03_resume.sql`
- Setup guide: `backend/data/RESUME_SETUP.md`
