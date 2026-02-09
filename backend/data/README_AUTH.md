# 🚀 Authentication - Quick Setup

## ✅ What You Have

1. **SQL Schema**: [01_authentication.sql](01_authentication.sql)
2. **Setup Guide**: [AUTH_SETUP.md](AUTH_SETUP.md)
3. **Test Script**: [test_auth_setup.py](test_auth_setup.py)
4. **Backend**: Auth routes already configured in `app/routes/auth.py`
5. **Frontend**: Auth page already configured in `src/pages/Auth.jsx`

## 🔥 Quick Start (3 Steps)

### Step 1: Update .env
```bash
# Edit backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### Step 2: Run SQL
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
2. Copy all content from `backend/data/01_authentication.sql`
3. Paste and click **Run**
4. Look for: `✅ Authentication schema created successfully`

### Step 3: Test It
```bash
cd backend
python test_auth_setup.py
```

Should see:
```
✅ 'users' table exists
✅ Registration works!
✅ User found in database
✅ Login works!
🎉 All authentication tests passed!
```

## 🎯 Try It Now

1. **Start Backend**:
   ```bash
   cd backend
   .\start_server.bat
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser**: http://localhost:5173/auth

4. **Register**: Click "Sign Up" and create an account

5. **Check Supabase**: Go to Table Editor → `users` table → See your user!

## 📊 What Gets Created

**Database Table**: `users`
- ✅ Stores user accounts
- ✅ Email is unique
- ✅ Password is hashed (SHA256)
- ✅ Auto-generates UUIDs
- ✅ Tracks timestamps

**API Endpoints**:
- ✅ `POST /api/auth/register` - Create account
- ✅ `POST /api/auth/login` - Sign in
- ✅ `GET /api/auth/verify` - Verify token
- ✅ `POST /api/auth/logout` - Sign out

**Frontend**:
- ✅ Beautiful auth page with animations
- ✅ Login and registration forms
- ✅ Password visibility toggle
- ✅ Form validation
- ✅ Stores tokens in localStorage

## ✨ Features

- 🔐 Secure password hashing
- 📧 Email validation
- 👤 User profiles
- 🎫 Session tokens
- ⏰ Auto-updating timestamps
- 🚫 Duplicate email prevention

## 🐛 Troubleshooting

**Can't find Supabase credentials?**
1. Go to: https://supabase.com/dashboard/project/_/settings/api
2. Copy "Project URL" → `SUPABASE_URL`
3. Copy "anon public" key → `SUPABASE_KEY`

**Table not found?**
- Make sure you ran the SQL file in Supabase SQL Editor
- Check for success message after running

**Backend won't start?**
- Check `.env` file has correct values
- Verify no typos in SUPABASE_URL or SUPABASE_KEY

**Registration fails?**
- Check backend console for detailed error
- Verify `users` table exists in Supabase
- Try the test script: `python test_auth_setup.py`

## 📚 Documentation

- **Detailed Guide**: [AUTH_SETUP.md](AUTH_SETUP.md)
- **Main Reset Guide**: [DATABASE_RESET_GUIDE.md](../DATABASE_RESET_GUIDE.md)

## ✅ Success Checklist

- [ ] `.env` configured with Supabase credentials
- [ ] SQL schema run in Supabase (users table created)
- [ ] Test script passes all checks
- [ ] Backend starts without errors
- [ ] Can register new user from frontend
- [ ] Can login with created user
- [ ] User appears in Supabase table editor

---

**Status**: 🟢 Ready  
**Next Feature**: Onboarding (user_context table)
