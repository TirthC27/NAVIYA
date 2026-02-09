"""
Test Onboarding Setup
Verifies onboarding tables and flow
"""

import asyncio
import httpx
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from dotenv import load_dotenv

load_dotenv()

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


async def check_tables_exist():
    """Check if onboarding tables exist"""
    print(f"\n{BLUE}📋 Checking onboarding tables...{RESET}")
    
    tables = {
        'user_context': False,
        'agent_tasks': False
    }
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            }
            
            for table_name in tables.keys():
                url = f"{settings.SUPABASE_URL}/rest/v1/{table_name}"
                response = await client.get(f"{url}?limit=0", headers=headers)
                
                if response.status_code == 200:
                    tables[table_name] = True
                    print(f"{GREEN}✅ '{table_name}' table exists{RESET}")
                else:
                    print(f"{RED}❌ '{table_name}' table not found{RESET}")
            
            all_exist = all(tables.values())
            if not all_exist:
                print(f"\n{YELLOW}💡 Run: backend/data/02_onboarding.sql{RESET}")
                return False
            
            return True
                
    except Exception as e:
        print(f"{RED}❌ Error checking tables: {str(e)}{RESET}")
        return False


async def test_onboarding_save():
    """Test saving onboarding data"""
    print(f"\n{BLUE}💾 Testing onboarding save...{RESET}")
    
    # First, create a test user
    import random
    test_email = f"onboard_test{random.randint(1000, 9999)}@example.com"
    
    try:
        async with httpx.AsyncClient() as client:
            # Register user
            reg_response = await client.post(
                "http://localhost:8000/api/auth/register",
                json={
                    "name": "Onboarding Test User",
                    "email": test_email,
                    "password": "test123"
                }
            )
            
            if reg_response.status_code not in [200, 201]:
                print(f"{RED}❌ Failed to create test user{RESET}")
                return False, None
            
            user_data = reg_response.json()
            user_id = user_data['user']['id']
            print(f"{GREEN}✅ Test user created: {user_id[:8]}...{RESET}")
            
            # Save onboarding data (Step 1)
            save_response = await client.post(
                "http://localhost:8000/api/onboarding/save",
                json={
                    "user_id": user_id,
                    "selected_domain": "Technology / Engineering",
                    "education_level": "Undergraduate (3rd/4th Year)"
                }
            )
            
            if save_response.status_code == 200:
                print(f"{GREEN}✅ Onboarding save works!{RESET}")
                return True, user_id
            else:
                print(f"{RED}❌ Save failed: {save_response.text}{RESET}")
                return False, None
                
    except httpx.ConnectError:
        print(f"{RED}❌ Cannot connect to backend{RESET}")
        print(f"{YELLOW}💡 Make sure backend is running: .\\start_server.bat{RESET}")
        return False, None
    except Exception as e:
        print(f"{RED}❌ Error: {str(e)}{RESET}")
        return False, None


async def test_onboarding_complete(user_id):
    """Test completing onboarding"""
    print(f"\n{BLUE}✅ Testing onboarding completion...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            complete_response = await client.post(
                "http://localhost:8000/api/onboarding/complete",
                json={
                    "user_id": user_id,
                    "selected_domain": "Technology / Engineering",
                    "education_level": "Undergraduate (3rd/4th Year)",
                    "current_stage": "3rd Year Student",
                    "career_goal_raw": "I want to become a full-stack developer at a top tech company",
                    "self_assessed_level": "intermediate",
                    "weekly_hours": 15,
                    "primary_blocker": "I struggle with consistency and time management"
                }
            )
            
            if complete_response.status_code == 200:
                data = complete_response.json()
                print(f"{GREEN}✅ Onboarding completion works!{RESET}")
                print(f"   Supervisor initialized: {data.get('supervisor_result', {})}")
                return True
            else:
                print(f"{RED}❌ Complete failed: {complete_response.text}{RESET}")
                return False
                
    except Exception as e:
        print(f"{RED}❌ Error: {str(e)}{RESET}")
        return False


async def verify_data_in_db(user_id):
    """Verify onboarding data was saved"""
    print(f"\n{BLUE}🔍 Verifying data in database...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            }
            
            # Check user_context
            url = f"{settings.SUPABASE_URL}/rest/v1/user_context?user_id=eq.{user_id}"
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                contexts = response.json()
                if contexts:
                    context = contexts[0]
                    print(f"{GREEN}✅ user_context found{RESET}")
                    print(f"   Domain: {context.get('selected_domain')}")
                    print(f"   Goal: {context.get('career_goal_raw', '')[:50]}...")
                    print(f"   Completed: {context.get('onboarding_completed')}")
                    
                    # Check agent_tasks
                    tasks_url = f"{settings.SUPABASE_URL}/rest/v1/agent_tasks?user_id=eq.{user_id}"
                    tasks_response = await client.get(tasks_url, headers=headers)
                    
                    if tasks_response.status_code == 200:
                        tasks = tasks_response.json()
                        print(f"{GREEN}✅ agent_tasks created: {len(tasks)} tasks{RESET}")
                        for task in tasks:
                            print(f"   - {task.get('task_name')} ({task.get('status')})")
                    
                    return True
                else:
                    print(f"{RED}❌ No user_context found{RESET}")
                    return False
            else:
                print(f"{RED}❌ Error querying database{RESET}")
                return False
                
    except Exception as e:
        print(f"{RED}❌ Error: {str(e)}{RESET}")
        return False


async def test_status_endpoint(user_id):
    """Test status endpoint"""
    print(f"\n{BLUE}📊 Testing status endpoint...{RESET}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8000/api/onboarding/status?user_id={user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"{GREEN}✅ Status endpoint works{RESET}")
                print(f"   Exists: {data.get('exists')}")
                print(f"   Completed: {data.get('onboarding_completed')}")
                print(f"   Supervisor: {data.get('supervisor_initialized')}")
                return True
            else:
                print(f"{RED}❌ Status check failed{RESET}")
                return False
                
    except Exception as e:
        print(f"{RED}❌ Error: {str(e)}{RESET}")
        return False


async def main():
    """Run all tests"""
    print("=" * 70)
    print(f"{BLUE}🧪 NAVIYA Onboarding Test Suite{RESET}")
    print("=" * 70)
    
    # Check environment
    print(f"\n{BLUE}🔧 Checking configuration...{RESET}")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print(f"{RED}❌ Supabase not configured{RESET}")
        return
    
    print(f"{GREEN}✅ Environment configured{RESET}")
    
    # Step 1: Check tables
    tables_exist = await check_tables_exist()
    if not tables_exist:
        return
    
    # Step 2: Test save
    save_success, user_id = await test_onboarding_save()
    if not save_success:
        return
    
    # Step 3: Test status
    await test_status_endpoint(user_id)
    
    # Step 4: Test complete
    complete_success = await test_onboarding_complete(user_id)
    if not complete_success:
        return
    
    # Step 5: Verify data
    await verify_data_in_db(user_id)
    
    # Summary
    print("\n" + "=" * 70)
    print(f"{GREEN}🎉 All onboarding tests passed!{RESET}")
    print("=" * 70)
    print(f"\n{YELLOW}Next steps:{RESET}")
    print(f"  1. Try the onboarding flow: http://localhost:5173/onboarding")
    print(f"  2. Register a real user and complete 7 steps")
    print(f"  3. Check Supabase tables for your data")
    print()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Test cancelled.{RESET}")
