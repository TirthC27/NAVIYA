# 🚀 NAVIYA Quick Start - Database Reset

## 📋 What Was Done

Your NAVIYA database has been prepared for a fresh start:

1. ✅ **Backed up** your existing `.env` file
2. ✅ **Created** a clean `.env` template
3. ✅ **Organized** all database schemas into feature-based SQL files
4. ✅ **Prepared** setup and verification scripts

## 🔄 Reset Process

### Step 1: Update Supabase Configuration

**Option A: Create a New Supabase Project (Recommended)**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details and wait ~2 minutes for setup
4. Copy your project URL and API key

**Option B: Use Existing Project (Will drop all tables)**
- Continue if you want to reuse your current Supabase project

### Step 2: Configure Environment

1. Open `backend/.env` in your editor
2. Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-public-key-here
   ```
3. Add your other API keys:
   - `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys
   - `YOUTUBE_API_KEY` - Get from https://console.cloud.google.com/apis/credentials
   - `OPIK_API_KEY` (Optional) - Get from https://www.comet.com/

### Step 3: Reset Database (If Reusing Project)

Only if you chose Option B above:

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
2. Open `backend/data/features/00_drop_all_tables.sql`
3. Copy all content and paste into SQL Editor
4. Click "Run" to drop all existing tables

### Step 4: Install Features

Choose which features you want to set up:

#### Minimal Setup (Recommended to Start)
1. `01_authentication.sql` - User accounts ✅ REQUIRED
2. `02_core_learning.sql` - Learning plans & videos
3. `03_onboarding.sql` - User onboarding flow

#### Full Feature Set
Run all files 01-10 in order for complete functionality.

**How to install each feature:**

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
2. Open feature file (e.g., `backend/data/features/01_authentication.sql`)
3. Copy entire content
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Look for success message: `✅ Feature X: ... tables created successfully`
7. Repeat for next feature

### Step 5: Verify Setup

Test your database connection and verify features:

```bash
cd backend
python verify_database_setup.py
```

This will show you which features are installed.

### Step 6: Start Backend

```bash
cd backend
.\start_server.bat
```

The server should start without errors on http://localhost:8000

### Step 7: Test Registration

Try registering a new user to verify everything works!

## 📁 New File Structure

```
backend/
├── .env                          # Your configuration (reset)
├── .env.example                  # Template with all options
├── .env.backup.YYYYMMDD_HHMMSS  # Your old .env backup
├── DATABASE_RESET_GUIDE.md       # Detailed reset documentation
├── setup_database.py             # Interactive setup wizard
├── verify_database_setup.py      # Verification script
└── data/
    └── features/                 # Modular SQL files
        ├── 00_drop_all_tables.sql
        ├── 01_authentication.sql
        ├── 02_core_learning.sql
        ├── 03_onboarding.sql
        ├── 04_resume_intelligence.sql
        ├── 05_career_roadmap.sql
        ├── 06_skill_assessment.sql
        ├── 07_mentor_chat.sql
        ├── 08_dashboard_metrics.sql
        ├── 09_mock_interviews.sql
        ├── 10_evaluation_feedback.sql
        └── README.md             # Feature documentation
```

## 🎯 Feature Overview

| # | Feature | Tables | Description |
|---|---------|--------|-------------|
| 01 | Authentication | 1 | User accounts and login |
| 02 | Core Learning | 4 | Learning plans, videos, progress |
| 03 | Onboarding | 2 | User context and agent tasks |
| 04 | Resume Intelligence | 3 | Resume analysis and skill extraction |
| 05 | Career Roadmap | 2 | Career path planning |
| 06 | Skill Assessment | 3 | Skill testing and evaluation |
| 07 | AI Mentor & Chat | 2 | Conversational AI mentor |
| 08 | Dashboard & Metrics | 2 | Dashboard state and activity logs |
| 09 | Mock Interviews | 1 | Interview simulations |
| 10 | Evaluation & Feedback | 4 | Feedback, evals, and profiles |

## 🆘 Troubleshooting

### "Could not find column in schema cache"
- Your table structure is outdated
- Drop the table and recreate using the latest SQL file

### "Connection refused" or "Invalid credentials"
- Check your `.env` file has correct SUPABASE_URL and SUPABASE_KEY
- Verify keys are from the correct project
- Make sure no extra spaces in the values

### "Relation already exists"
- Table already exists in database
- Either drop it first or skip that feature

### "Permission denied for table"
- Using wrong API key (use anon/public key, not service role)
- Check RLS policies if you've enabled them

## 💡 Tips

- **Start Small**: Begin with features 1-3, add more later
- **Test Often**: Run verification script after each feature
- **Keep Backups**: Your old .env is backed up automatically
- **Read Logs**: Server logs show database errors clearly

## 📚 Documentation

- **Full Guide**: `backend/DATABASE_RESET_GUIDE.md`
- **Feature Details**: `backend/data/features/README.md`
- **Main README**: Root project README

## ✅ Success Checklist

- [ ] Supabase project created or existing project ready
- [ ] `.env` file configured with all credentials
- [ ] Feature 01 (Authentication) installed
- [ ] Additional features installed as needed
- [ ] Verification script shows features as "COMPLETE"
- [ ] Backend server starts without errors
- [ ] Can register a new user successfully

---

**Need Help?** Check the detailed guides or review server logs for specific errors.
