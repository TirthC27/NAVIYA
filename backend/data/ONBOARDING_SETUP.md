# 🎯 Onboarding Setup Guide

## What This Creates

A complete 7-step onboarding flow with:
- ✅ Domain selection (Tech, Medical, Business, etc.)
- ✅ Education level tracking
- ✅ Current career stage
- ✅ Career goal capture (free text)
- ✅ Self-assessment level
- ✅ Time commitment (weekly hours)
- ✅ Primary blocker/challenge
- ✅ Supervisor task initialization

## Database Tables

### Table 1: `user_context`
Stores all onboarding data for each user (one row per user)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated ID |
| `user_id` | UUID | References users table (UNIQUE) |
| **Step 1** | | |
| `selected_domain` | TEXT | Domain (Technology, Medical, etc.) |
| **Step 2** | | |
| `education_level` | TEXT | Education level |
| **Step 3** | | |
| `current_stage` | TEXT | Career stage (student year, professional) |
| **Step 4** | | |
| `career_goal_raw` | TEXT | Career goal description |
| **Step 5** | | |
| `self_assessed_level` | TEXT | beginner/intermediate/advanced/unknown |
| **Step 6** | | |
| `weekly_hours` | INTEGER | Time commitment (5-20+ hours) |
| **Step 7** | | |
| `primary_blocker` | TEXT | Main challenge/obstacle |
| **Status** | | |
| `onboarding_completed` | BOOLEAN | All steps completed? |
| `onboarding_step` | INTEGER | Current step (0-7) |
| `supervisor_initialized` | BOOLEAN | Supervisor agent ran? |
| `supervisor_last_run` | TIMESTAMP | Last supervisor run time |
| **Extra** | | |
| `interests` | JSONB | User interests (array) |
| `skills` | JSONB | User skills (array) |
| `preferences` | JSONB | Additional preferences (object) |
| `created_at` | TIMESTAMP | When created |
| `updated_at` | TIMESTAMP | Last updated (auto) |
| `completed_at` | TIMESTAMP | When onboarding completed |

### Table 2: `agent_tasks`
Tracks background tasks created by supervisor

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated task ID |
| `user_id` | UUID | References users table |
| `task_type` | TEXT | Type (resume_analysis, roadmap_gen, etc.) |
| `task_name` | TEXT | Human-readable task name |
| `description` | TEXT | Task description |
| `agent_name` | TEXT | Which agent handles this |
| `status` | TEXT | pending/running/completed/failed/cancelled |
| `priority` | INTEGER | Task priority (0=normal) |
| `input_data` | JSONB | Input parameters |
| `output_data` | JSONB | Results/output |
| `error_message` | TEXT | Error if failed |
| `execution_time_ms` | INTEGER | How long it took |
| `retry_count` | INTEGER | Number of retries |
| `created_at` | TIMESTAMP | When created |
| `started_at` | TIMESTAMP | When started |
| `completed_at` | TIMESTAMP | When finished |
| `updated_at` | TIMESTAMP | Last updated (auto) |

## Setup Steps

### 1. Run SQL in Supabase

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/_/sql
   ```

2. Copy contents of `backend/data/02_onboarding.sql`

3. Paste and click **Run**

4. Look for success messages:
   ```
   ✅ Onboarding schema created successfully
   📝 Created tables: user_context, agent_tasks
   🎯 7-step onboarding flow ready
   🤖 Supervisor task tracking enabled
   ```

### 2. Verify Tables

Run this query to verify:

```sql
-- Check user_context columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_context' 
ORDER BY ordinal_position;

-- Check agent_tasks columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_tasks' 
ORDER BY ordinal_position;
```

## Onboarding Flow

### Frontend → Backend Flow:

```
Step 1-7: User fills each step
  ↓
Calls POST /api/onboarding/save after each step
  ↓
{
  "user_id": "uuid",
  "selected_domain": "Technology / Engineering",  // Step 1
  "education_level": "Undergraduate (3rd/4th Year)", // Step 2
  "current_stage": "3rd Year Student",  // Step 3
  // ... other fields as user progresses
}
  ↓
Backend upserts to user_context table
  ↓
Step 7 Complete → Calls POST /api/onboarding/complete
  ↓
Sets onboarding_completed = true
Triggers SupervisorAgent
  ↓
Creates tasks in agent_tasks table
  ↓
Redirects to /career/dashboard
```

### Auto-Save Feature:

- ✅ Each step auto-saves to database
- ✅ If user refreshes, they can resume from where they left off
- ✅ Progress tracked with `onboarding_step` field

## API Endpoints

### GET `/api/onboarding/status?user_id={uuid}`
Check if user completed onboarding

**Response:**
```json
{
  "exists": true,
  "onboarding_completed": false,
  "supervisor_initialized": false
}
```

### POST `/api/onboarding/save`
Save progress after each step (auto-save)

**Request:**
```json
{
  "user_id": "uuid",
  "selected_domain": "Technology / Engineering",
  "education_level": "Undergraduate (3rd/4th Year)",
  // ... only include fields from completed steps
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress saved"
}
```

### POST `/api/onboarding/complete`
Complete onboarding (after step 7)

**Request:**
```json
{
  "user_id": "uuid",
  "selected_domain": "Technology / Engineering",
  "education_level": "Undergraduate (3rd/4th Year)",
  "current_stage": "3rd Year Student",
  "career_goal_raw": "I want to become a full-stack developer...",
  "self_assessed_level": "intermediate",
  "weekly_hours": 15,
  "primary_blocker": "I struggle with staying consistent..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed",
  "supervisor_result": {
    "domain_supported": true,
    "limited_mode": false,
    "tasks_created": 3
  }
}
```

### GET `/api/onboarding/context/{user_id}`
Get full user context (for AI agents)

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "selected_domain": "Technology / Engineering",
  "career_goal_raw": "...",
  "onboarding_completed": true,
  // ... all other fields
}
```

### GET `/api/onboarding/dashboard-state/{user_id}`
Get dashboard state including tasks

**Response:**
```json
{
  "user_context": { /* user_context row */ },
  "agent_tasks": [ /* array of tasks */ ],
  "is_setting_up": false,
  "show_full_dashboard": true,
  "tasks_summary": {
    "total": 3,
    "pending": 0,
    "running": 0,
    "completed": 3,
    "failed": 0
  }
}
```

## Features

### 🔄 Auto-Save
Every step automatically saves to database using upsert logic

### 📊 Progress Tracking
`onboarding_step` field tracks which step user is on (0-7)

### ⏰ Auto-Timestamps
- `created_at` - when first created
- `updated_at` - auto-updated on every change
- `completed_at` - set when onboarding completes

### 🤖 Supervisor Integration
When onboarding completes:
1. Sets `onboarding_completed = true`
2. Triggers SupervisorAgent
3. Creates tasks in `agent_tasks` table
4. Sets `supervisor_initialized = true`

### 🎯 Helper Function
Built-in function to calculate progress:
```sql
SELECT get_onboarding_progress('user-uuid-here');
-- Returns: 0-100 (percentage)
```

## Testing the Flow

### 1. Start Backend
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Registration → Onboarding
1. Go to http://localhost:5173/auth
2. Register a new account
3. Should auto-redirect to `/onboarding`
4. Complete all 7 steps
5. Should redirect to `/career/dashboard`

### 4. Verify in Supabase
Check your data in Supabase Table Editor:
- `user_context` table - should have one row with all your answers
- `agent_tasks` table - should have tasks created by supervisor

## Data Validation

### Field Constraints:
- ✅ `self_assessed_level` - must be beginner/intermediate/advanced/unknown
- ✅ `weekly_hours` - must be 0-168 (max hours in a week)
- ✅ `onboarding_step` - must be 0-7
- ✅ `status` (agent_tasks) - must be valid status enum
- ✅ `user_id` - unique per user (one context per user)

## Troubleshooting

### Error: "User context not found"
- User hasn't started onboarding yet
- Call `/api/onboarding/save` to create initial row

### Error: "Failed to save progress"
- Check that `users` table exists (foreign key requirement)
- Verify user_id is valid UUID from registration

### Tasks not created after onboarding
- Check `supervisor_initialized` field
- Manually trigger: `POST /api/onboarding/run-supervisor/{user_id}`

### User stuck at onboarding after completing
- Check `onboarding_completed` is set to `true`
- Verify frontend auth guard is checking status correctly

## Next Steps

After onboarding is working:

1. ✅ Users can register and complete onboarding
2. 🔜 Add additional features (resume, roadmap, etc.)
3. 🔜 Build out supervisor agent logic
4. 🔜 Create dashboard to show user context

---

**Status:** ✅ Ready to use  
**Tables:** 2 (user_context, agent_tasks)  
**Steps:** 7 (complete onboarding flow)  
**Dependencies:** Requires `users` table (Feature 01)
