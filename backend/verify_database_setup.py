"""
NAVIYA - Database Setup Verification Script
Tests the Supabase connection and verifies table creation
"""

import os
import sys
from typing import List, Dict
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.supabase_client import get_supabase_client

# Load environment variables
load_dotenv()


def check_env_vars() -> bool:
    """Check if required environment variables are set"""
    print("🔍 Checking environment variables...")
    
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("💡 Copy .env.example to .env and fill in your Supabase credentials")
        return False
    
    print("✅ All required environment variables are set")
    return True


def test_connection() -> bool:
    """Test Supabase connection"""
    print("\n🔌 Testing Supabase connection...")
    
    try:
        client = get_supabase_client()
        print("✅ Successfully connected to Supabase")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False


def get_feature_tables() -> Dict[str, List[str]]:
    """Define expected tables for each feature"""
    return {
        "01_authentication": ["users"],
        "02_core_learning": ["learning_plans", "roadmap_steps", "videos", "progress"],
        "03_onboarding": ["user_context", "agent_tasks"],
        "04_resume_intelligence": ["resume_documents", "resume_analysis", "user_skills"],
        "05_career_roadmap": ["career_roadmap", "roadmap_phase_progress"],
        "06_skill_assessment": ["skill_assessments", "assessment_questions", "assessment_responses"],
        "07_mentor_chat": ["mentor_sessions", "mentor_messages"],
        "08_dashboard_metrics": ["dashboard_state", "agent_activity_log"],
        "09_mock_interviews": ["mock_interviews"],
        "10_evaluation_feedback": ["feedback", "eval_runs", "prompt_versions", "user_career_profile"]
    }


def check_tables() -> Dict[str, bool]:
    """Check which tables exist in the database"""
    print("\n📊 Checking database tables...")
    
    try:
        client = get_supabase_client()
        
        # Query to get all user tables
        response = client.rpc('exec_sql', {
            'sql': """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
        }).execute()
        
        # Alternative method if RPC doesn't work
        existing_tables = set()
        feature_tables = get_feature_tables()
        
        # Try to query each expected table
        all_expected_tables = []
        for tables in feature_tables.values():
            all_expected_tables.extend(tables)
        
        for table in all_expected_tables:
            try:
                # Try to select from the table (limit 0 to not fetch data)
                client.table(table).select("*").limit(0).execute()
                existing_tables.add(table)
            except:
                pass
        
        return existing_tables
        
    except Exception as e:
        print(f"❌ Error checking tables: {str(e)}")
        return set()


def verify_setup():
    """Main verification function"""
    print("=" * 60)
    print("NAVIYA Database Setup Verification")
    print("=" * 60)
    
    # Step 1: Check environment variables
    if not check_env_vars():
        return
    
    # Step 2: Test connection
    if not test_connection():
        return
    
    # Step 3: Check tables
    existing_tables = check_tables()
    feature_tables = get_feature_tables()
    
    print("\n📋 Feature Setup Status:")
    print("-" * 60)
    
    total_features = len(feature_tables)
    setup_features = 0
    
    for feature, tables in feature_tables.items():
        feature_name = feature.replace("_", " ").title()
        tables_exist = [table for table in tables if table in existing_tables]
        
        if len(tables_exist) == len(tables):
            status = "✅ COMPLETE"
            setup_features += 1
        elif len(tables_exist) > 0:
            status = "⚠️  PARTIAL"
        else:
            status = "❌ NOT SETUP"
        
        print(f"\n{feature_name}:")
        print(f"  Status: {status}")
        print(f"  Tables: {len(tables_exist)}/{len(tables)}")
        
        if len(tables_exist) < len(tables):
            missing = [t for t in tables if t not in existing_tables]
            print(f"  Missing: {', '.join(missing)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Summary:")
    print(f"  Features Setup: {setup_features}/{total_features}")
    print(f"  Tables Found: {len(existing_tables)}")
    
    if existing_tables:
        print(f"\n✅ Existing tables: {', '.join(sorted(existing_tables))}")
    
    if setup_features == 0:
        print("\n💡 No features found. Start by running:")
        print("   1. data/features/01_authentication.sql")
        print("   2. data/features/02_core_learning.sql")
        print("   3. Additional features as needed")
    elif setup_features < total_features:
        print(f"\n💡 {total_features - setup_features} features remaining.")
        print("   Run the missing feature SQL files to complete setup.")
    else:
        print("\n🎉 All features are set up!")
    
    print("=" * 60)


if __name__ == "__main__":
    verify_setup()
