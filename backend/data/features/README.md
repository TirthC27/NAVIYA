# NAVIYA Database Features

This directory contains modular SQL files for setting up NAVIYA features one by one.

## 📁 Structure

Each feature has its own SQL file that creates the necessary tables, indexes, and triggers:

- `00_drop_all_tables.sql` - Reset script (drops all tables)
- `01_authentication.sql` - User authentication
- `02_core_learning.sql` - Learning plans, videos, progress
- `03_onboarding.sql` - User onboarding and context
- `04_resume_intelligence.sql` - Resume analysis and skills
- `05_career_roadmap.sql` - Career path planning
- `06_skill_assessment.sql` - Skill testing and evaluation
- `07_mentor_chat.sql` - AI mentor conversations
- `08_dashboard_metrics.sql` - Dashboard and activity tracking
- `09_mock_interviews.sql` - Interview simulations
- `10_evaluation_feedback.sql` - Feedback and evaluations

## 🚀 Quick Start

### Full Setup (All Features)
Run all files in order (01 through 10) in Supabase SQL Editor.

### Minimal Setup (Core Features Only)
Run only these files:
1. `01_authentication.sql`
2. `02_core_learning.sql`
3. `03_onboarding.sql`

### Custom Setup
Pick and choose the features you need and run the corresponding SQL files.

## ⚠️ Important Notes

1. **Order Matters**: Feature 01 (Authentication) must be run first as other tables reference the `users` table.

2. **Foreign Key Dependencies**:
   - Most tables depend on `users` (Feature 01)
   - Some tables have inter-dependencies (e.g., videos → learning_plans)

3. **Reset Instructions**: To start fresh, run `00_drop_all_tables.sql` first.

## 🔄 Dependencies

```
users (01)
├── learning_plans (02)
│   ├── roadmap_steps (02)
│   ├── videos (02)
│   └── progress (02)
├── user_context (03)
├── agent_tasks (03)
├── resume_documents (04)
│   └── resume_analysis (04)
├── user_skills (04)
├── career_roadmap (05)
│   └── roadmap_phase_progress (05)
├── skill_assessments (06)
│   ├── assessment_questions (06)
│   └── assessment_responses (06)
├── mentor_sessions (07)
│   └── mentor_messages (07)
├── dashboard_state (08)
├── agent_activity_log (08)
├── mock_interviews (09)
├── feedback (10)
└── user_career_profile (10)

Independent:
├── eval_runs (10)
└── prompt_versions (10)
```

## 📖 Usage Example

1. Create a new Supabase project
2. Copy contents of `01_authentication.sql`
3. Paste into Supabase SQL Editor
4. Run the query
5. Repeat for other features you need

## ✅ Verification

After running the SQL files, verify your tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 🛠️ Maintenance

- All tables include `created_at` timestamps
- Most tables have `updated_at` with auto-update triggers
- Proper indexes are included for common queries
- Foreign keys use CASCADE for clean deletes
