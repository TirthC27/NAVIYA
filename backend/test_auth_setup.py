"""
Test Authentication Setup
Verifies that the users table exists and auth endpoints work
"""

import asyncio
import httpx
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from dotenv import load_dotenv

load_dotenv()

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


async def check_table_exists():
    """Check if users table exists"""
    print(f"\n{BLUE}📋 Checking if 'users' table exists...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/users"
            headers = {
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            }
            
            # Try to query the table (limit 0 to not fetch data)
            response = await client.get(f"{url}?limit=0", headers=headers)
            
            if response.status_code == 200:
                print(f"{GREEN}✅ 'users' table exists{RESET}")
                return True
            else:
                print(f"{RED}❌ 'users' table not found{RESET}")
                print(f"{YELLOW}💡 Run the SQL file: backend/data/01_authentication.sql{RESET}")
                return False
                
    except Exception as e:
        print(f"{RED}❌ Error checking table: {str(e)}{RESET}")
        return False


async def test_registration():
    """Test user registration"""
    print(f"\n{BLUE}📝 Testing registration endpoint...{RESET}")
    
    import random
    test_email = f"test{random.randint(1000, 9999)}@example.com"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://naviya-backend.onrender.com/api/auth/register",
                json={
                    "name": "Test User",
                    "email": test_email,
                    "password": "test123"
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get("success"):
                    print(f"{GREEN}✅ Registration works!{RESET}")
                    print(f"   Created user: {data['user']['email']}")
                    return True, data
                else:
                    print(f"{RED}❌ Registration failed: {data}{RESET}")
                    return False, None
            else:
                print(f"{RED}❌ Registration failed with status {response.status_code}{RESET}")
                print(f"   Response: {response.text}")
                return False, None
                
    except httpx.ConnectError:
        print(f"{RED}❌ Cannot connect to backend{RESET}")
        print(f"{YELLOW}💡 Make sure backend is running: uvicorn app.main:app --host 0.0.0.0 --port 8000{RESET}")
        return False, None
    except Exception as e:
        print(f"{RED}❌ Error testing registration: {str(e)}{RESET}")
        return False, None


async def test_login(email, password):
    """Test user login"""
    print(f"\n{BLUE}🔐 Testing login endpoint...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://naviya-backend.onrender.com/api/auth/login",
                json={
                    "email": email,
                    "password": password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"{GREEN}✅ Login works!{RESET}")
                    print(f"   Logged in: {data['user']['email']}")
                    return True, data
                else:
                    print(f"{RED}❌ Login failed: {data}{RESET}")
                    return False, None
            else:
                print(f"{RED}❌ Login failed with status {response.status_code}{RESET}")
                print(f"   Response: {response.text}")
                return False, None
                
    except Exception as e:
        print(f"{RED}❌ Error testing login: {str(e)}{RESET}")
        return False, None


async def verify_user_in_db(email):
    """Verify user exists in database"""
    print(f"\n{BLUE}🔍 Verifying user in database...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/users?email=eq.{email}"
            headers = {
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            }
            
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                users = response.json()
                if users:
                    user = users[0]
                    print(f"{GREEN}✅ User found in database{RESET}")
                    print(f"   ID: {user['id']}")
                    print(f"   Email: {user['email']}")
                    print(f"   Name: {user['display_name']}")
                    print(f"   Created: {user['created_at']}")
                    return True
                else:
                    print(f"{RED}❌ User not found in database{RESET}")
                    return False
            else:
                print(f"{RED}❌ Error querying database{RESET}")
                return False
                
    except Exception as e:
        print(f"{RED}❌ Error verifying user: {str(e)}{RESET}")
        return False


async def main():
    """Run all tests"""
    print("=" * 70)
    print(f"{BLUE}🧪 NAVIYA Authentication Test Suite{RESET}")
    print("=" * 70)
    
    # Check environment
    print(f"\n{BLUE}🔧 Checking configuration...{RESET}")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print(f"{RED}❌ Supabase not configured{RESET}")
        print(f"{YELLOW}💡 Set SUPABASE_URL and SUPABASE_KEY in .env file{RESET}")
        return
    
    print(f"{GREEN}✅ Environment configured{RESET}")
    print(f"   Supabase URL: {settings.SUPABASE_URL[:30]}...")
    
    # Step 1: Check table exists
    table_exists = await check_table_exists()
    if not table_exists:
        print(f"\n{RED}⚠️  Cannot proceed without 'users' table{RESET}")
        return
    
    # Step 2: Test registration
    reg_success, reg_data = await test_registration()
    if not reg_success:
        print(f"\n{RED}⚠️  Cannot proceed without working registration{RESET}")
        return
    
    # Step 3: Verify user in database
    await verify_user_in_db(reg_data['user']['email'])
    
    # Step 4: Test login
    await test_login(reg_data['user']['email'], "test123")
    
    # Summary
    print("\n" + "=" * 70)
    print(f"{GREEN}🎉 All authentication tests passed!{RESET}")
    print("=" * 70)
    print(f"\n{YELLOW}Next steps:{RESET}")
    print(f"  1. Try logging in from the frontend: http://localhost:5173/auth")
    print(f"  2. Create a real user account")
    print(f"  3. Setup the next feature (onboarding)")
    print()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Test cancelled.{RESET}")
