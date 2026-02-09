"""
NAVIYA - Quick Database Reset Script
Provides interactive prompts to reset and setup the database
"""

import os
import sys
from pathlib import Path

# ANSI color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header():
    """Print welcome header"""
    print("=" * 70)
    print(f"{BLUE}🔄 NAVIYA Database Reset & Setup Wizard{RESET}")
    print("=" * 70)
    print()


def print_section(title: str):
    """Print section header"""
    print(f"\n{YELLOW}{'─' * 70}{RESET}")
    print(f"{YELLOW}{title}{RESET}")
    print(f"{YELLOW}{'─' * 70}{RESET}\n")


def check_env_setup() -> bool:
    """Check if .env is configured"""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print(f"{RED}❌ .env file not found{RESET}")
        print(f"{YELLOW}💡 Copy .env.example to .env first{RESET}")
        return False
    
    with open(env_path, "r") as f:
        content = f.read()
        
    # Check if SUPABASE_URL and SUPABASE_KEY are set
    if "SUPABASE_URL=" in content and not "SUPABASE_URL=\n" in content:
        url_set = True
    else:
        url_set = False
        
    if "SUPABASE_KEY=" in content and not "SUPABASE_KEY=\n" in content:
        key_set = True
    else:
        key_set = False
    
    if not url_set or not key_set:
        print(f"{YELLOW}⚠️  Supabase credentials not configured in .env{RESET}")
        return False
    
    return True


def main():
    """Main setup wizard"""
    print_header()
    
    # Step 1: Environment Check
    print_section("📋 Step 1: Environment Configuration Check")
    
    if check_env_setup():
        print(f"{GREEN}✅ Environment variables are configured{RESET}")
    else:
        print(f"\n{YELLOW}Please complete .env configuration first:{RESET}")
        print(f"  1. Get your Supabase project URL and key from:")
        print(f"     {BLUE}https://supabase.com/dashboard/project/_/settings/api{RESET}")
        print(f"  2. Edit backend/.env and fill in:")
        print(f"     - SUPABASE_URL")
        print(f"     - SUPABASE_KEY")
        print(f"  3. Run this script again")
        return
    
    # Step 2: Database Reset Instructions
    print_section("🗑️  Step 2: Reset Database (Optional)")
    
    print(f"{YELLOW}If you want to start fresh, drop all existing tables:{RESET}")
    print(f"  1. Open Supabase SQL Editor:")
    print(f"     {BLUE}https://supabase.com/dashboard/project/_/sql{RESET}")
    print(f"  2. Copy the contents of:")
    print(f"     {BLUE}backend/data/features/00_drop_all_tables.sql{RESET}")
    print(f"  3. Paste and run in SQL Editor")
    print()
    print(f"{YELLOW}Skip this step if you're setting up a fresh Supabase project{RESET}")
    
    input(f"\n{GREEN}Press Enter when ready to continue...{RESET}")
    
    # Step 3: Feature Selection
    print_section("🏗️  Step 3: Select Features to Setup")
    
    features = {
        "1": ("Authentication (Required)", "01_authentication.sql"),
        "2": ("Core Learning System", "02_core_learning.sql"),
        "3": ("Onboarding System", "03_onboarding.sql"),
        "4": ("Resume Intelligence", "04_resume_intelligence.sql"),
        "5": ("Career Roadmap", "05_career_roadmap.sql"),
        "6": ("Skill Assessment", "06_skill_assessment.sql"),
        "7": ("AI Mentor & Chat", "07_mentor_chat.sql"),
        "8": ("Dashboard & Metrics", "08_dashboard_metrics.sql"),
        "9": ("Mock Interviews", "09_mock_interviews.sql"),
        "10": ("Evaluation & Feedback", "10_evaluation_feedback.sql"),
    }
    
    print(f"{YELLOW}Available features:{RESET}")
    for num, (name, _) in features.items():
        print(f"  {num}. {name}")
    
    print(f"\n{YELLOW}Recommended minimal setup: 1, 2, 3{RESET}")
    print(f"{YELLOW}Full setup: 1-10{RESET}")
    
    # Step 4: Installation Instructions
    print_section("📝 Step 4: Install Features")
    
    print(f"{YELLOW}For each feature you want to setup:{RESET}")
    print()
    print(f"  1. Open Supabase SQL Editor:")
    print(f"     {BLUE}https://supabase.com/dashboard/project/_/sql{RESET}")
    print()
    print(f"  2. Open the feature file in order (starting with 01):")
    print(f"     {BLUE}backend/data/features/XX_feature_name.sql{RESET}")
    print()
    print(f"  3. Copy the entire SQL content")
    print()
    print(f"  4. Paste into Supabase SQL Editor and click 'Run'")
    print()
    print(f"  5. Look for success message: {GREEN}✅ Feature X: ... tables created successfully{RESET}")
    print()
    print(f"  6. Repeat for next feature")
    
    # Step 5: Verification
    print_section("✅ Step 5: Verify Setup")
    
    print(f"{YELLOW}After setting up your features, verify the installation:{RESET}")
    print()
    print(f"  Run: {BLUE}python verify_database_setup.py{RESET}")
    print()
    print(f"This will check which features are properly installed.")
    
    # Final instructions
    print_section("🎉 Next Steps")
    
    print(f"1. {GREEN}Setup your features{RESET} using the SQL files")
    print(f"2. {GREEN}Verify setup{RESET}: python verify_database_setup.py")
    print(f"3. {GREEN}Start backend{RESET}: Run .\start_server.bat")
    print(f"4. {GREEN}Test your app{RESET}: Try registering a user")
    
    print(f"\n{YELLOW}📚 Documentation:{RESET}")
    print(f"  - Full guide: {BLUE}backend/DATABASE_RESET_GUIDE.md{RESET}")
    print(f"  - Feature details: {BLUE}backend/data/features/README.md{RESET}")
    
    print("\n" + "=" * 70)
    print(f"{GREEN}Good luck with your setup! 🚀{RESET}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Setup wizard cancelled.{RESET}")
        sys.exit(0)
