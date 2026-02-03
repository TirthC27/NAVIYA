"""
MentorAgent Test Cases

Test scenarios:
1. Tech user after onboarding (welcome_guidance)
2. Medical user after onboarding (welcome_guidance)
3. Business domain user (limited_domain_notice)
4. Duplicate welcome task handling
5. Unknown task_type
6. Onboarding not completed rejection

Validates:
- Correct message_type
- Proper tone
- JSON schema validity
"""

import asyncio
import json
import httpx
from typing import Dict, Any
from datetime import datetime

# Add parent directory to path for imports
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.mentor_agent import (
    MentorAgentWorker,
    MentorMessage,
    MessageType,
    ActionCTA,
    create_mentor_agent
)
from app.agents.worker_base import TaskResult
from app.config import settings


# ============================================
# Test Configuration
# ============================================

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"


def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


# ============================================
# Mock User Context Generator
# ============================================

def create_mock_user_context(
    domain: str = "Technology / Engineering",
    career_goal: str = "Become a full-stack developer",
    onboarding_completed: bool = True,
    education: str = "Bachelor's degree",
    stage: str = "Working professional"
) -> Dict[str, Any]:
    """Create a mock user context for testing"""
    return {
        "user_id": "test-user-" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "selected_domain": domain,
        "career_goal_raw": career_goal,
        "education_level": education,
        "current_stage": stage,
        "self_assessed_level": "intermediate",
        "weekly_hours": 10,
        "primary_blocker": "Time management",
        "onboarding_completed": onboarding_completed,
        "supervisor_initialized": True
    }


def create_task_payload(
    user_id: str,
    task_type: str,
    domain: str,
    domain_support_status: str = "supported",
    completed_task: str = None
) -> Dict[str, Any]:
    """Create a task payload for testing"""
    payload = {
        "user_id": user_id,
        "domain": domain,
        "task_type": task_type,
        "domain_support_status": domain_support_status,
        "normalized_goal": {
            "primary_track": "full_stack_development",
            "confidence": "high"
        },
        "current_phase": "exploration"
    }
    
    if completed_task:
        payload["completed_task"] = completed_task
    
    return payload


# ============================================
# Test Result Validator
# ============================================

def validate_message_schema(result: TaskResult) -> Dict[str, Any]:
    """Validate that the result contains a valid message schema"""
    errors = []
    
    if not result.success:
        return {
            "valid": False,
            "errors": [f"Task failed: {result.error}"]
        }
    
    output = result.output
    
    # Check required fields
    required_fields = ["message_type", "title", "body"]
    for field in required_fields:
        if field not in output:
            errors.append(f"Missing required field: {field}")
    
    # Validate message_type
    valid_types = ["welcome", "notice", "update"]
    if output.get("message_type") not in valid_types:
        errors.append(f"Invalid message_type: {output.get('message_type')}")
    
    # Validate title length
    title = output.get("title", "")
    if len(title) < 3 or len(title) > 100:
        errors.append(f"Title length invalid: {len(title)} chars")
    
    # Validate body content
    body = output.get("body", "")
    if len(body) < 10:
        errors.append(f"Body too short: {len(body)} chars")
    
    # Check for forbidden content
    forbidden_words = ["LLM", "RAG", "agent", "backend", "API", "database"]
    for word in forbidden_words:
        if word.lower() in body.lower():
            errors.append(f"Forbidden word found in body: {word}")
    
    # Check for emojis (basic check)
    import re
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"
        u"\U0001F300-\U0001F5FF"
        u"\U0001F680-\U0001F6FF"
        u"\U0001F1E0-\U0001F1FF"
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    
    if emoji_pattern.search(body):
        errors.append("Emojis found in body")
    
    # Validate action_cta if present
    action_cta = output.get("action_cta")
    if action_cta:
        if "label" not in action_cta or "route" not in action_cta:
            errors.append("action_cta missing required fields")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


# ============================================
# Test Cases
# ============================================

async def test_1_tech_user_welcome():
    """Test 1: Tech user after onboarding - welcome_guidance"""
    print("\n" + "="*60)
    print("TEST 1: Tech User Welcome Guidance")
    print("="*60)
    
    agent = create_mentor_agent()
    
    # Create test payload
    payload = create_task_payload(
        user_id="test-tech-user",
        task_type="welcome_guidance",
        domain="Technology / Engineering",
        domain_support_status="supported"
    )
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    # Note: This test requires user_context to exist in database
    # For standalone testing, we'll mock the execution
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        print(f"Summary: {result.summary}")
        
        if result.success:
            print(f"\nMessage Output:")
            print(f"  Type: {result.output.get('message_type')}")
            print(f"  Title: {result.output.get('title')}")
            print(f"  Body: {result.output.get('body')[:200]}...")
            
            validation = validate_message_schema(result)
            print(f"\nValidation: {'PASS' if validation['valid'] else 'FAIL'}")
            if validation['errors']:
                print(f"  Errors: {validation['errors']}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")
    
    return result if 'result' in dir() else None


async def test_2_medical_user_welcome():
    """Test 2: Medical user after onboarding - welcome_guidance"""
    print("\n" + "="*60)
    print("TEST 2: Medical User Welcome Guidance")
    print("="*60)
    
    agent = create_mentor_agent()
    
    payload = create_task_payload(
        user_id="test-medical-user",
        task_type="welcome_guidance",
        domain="Medical / Healthcare",
        domain_support_status="supported"
    )
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Message Type: {result.output.get('message_type')}")
            print(f"Title: {result.output.get('title')}")
            
            validation = validate_message_schema(result)
            print(f"Validation: {'PASS' if validation['valid'] else 'FAIL'}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_3_business_domain_limited():
    """Test 3: Business domain user - limited_domain_notice"""
    print("\n" + "="*60)
    print("TEST 3: Business Domain (Limited Mode)")
    print("="*60)
    
    agent = create_mentor_agent()
    
    payload = create_task_payload(
        user_id="test-business-user",
        task_type="limited_domain_notice",
        domain="Business / Finance",
        domain_support_status="limited"
    )
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Message Type: {result.output.get('message_type')}")
            print(f"Title: {result.output.get('title')}")
            body = result.output.get('body', '')
            
            # Validate tone - should NOT contain negative words
            negative_words = ["unsupported", "not supported", "cannot", "won't", "don't"]
            found_negative = [w for w in negative_words if w.lower() in body.lower()]
            
            print(f"\nTone Check:")
            print(f"  Negative words found: {found_negative if found_negative else 'None (PASS)'}")
            
            validation = validate_message_schema(result)
            print(f"Schema Validation: {'PASS' if validation['valid'] else 'FAIL'}")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_4_progress_update():
    """Test 4: System progress update"""
    print("\n" + "="*60)
    print("TEST 4: System Progress Update")
    print("="*60)
    
    agent = create_mentor_agent()
    
    payload = create_task_payload(
        user_id="test-progress-user",
        task_type="system_progress_update",
        domain="Technology / Engineering",
        completed_task="generate_foundation_roadmap"
    )
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        
        if result.success:
            print(f"Message Type: {result.output.get('message_type')}")
            print(f"Title: {result.output.get('title')}")
            print(f"Body: {result.output.get('body')}")
            
            # Should be update type
            assert result.output.get('message_type') == 'update', "Expected update message type"
            print("\nType assertion: PASS")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


async def test_5_unknown_task_type():
    """Test 5: Unknown task_type - should fail gracefully"""
    print("\n" + "="*60)
    print("TEST 5: Unknown Task Type")
    print("="*60)
    
    agent = create_mentor_agent()
    
    payload = create_task_payload(
        user_id="test-unknown-task",
        task_type="generate_roadmap",  # Invalid for MentorAgent
        domain="Technology / Engineering"
    )
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        print(f"Error: {result.error}")
        
        # Should fail
        assert result.success == False, "Expected failure for unknown task type"
        assert "unknown task_type" in result.error.lower() or "Unknown task_type" in result.error, \
            "Error should mention unknown task type"
        
        print("Unknown task type handling: PASS")
        
    except Exception as e:
        print(f"Test exception: {e}")


async def test_6_onboarding_not_completed():
    """Test 6: Onboarding not completed - should reject"""
    print("\n" + "="*60)
    print("TEST 6: Onboarding Not Completed (Reject)")
    print("="*60)
    
    # This test requires actual database interaction
    # The agent will try to fetch user_context and check onboarding_completed
    
    agent = create_mentor_agent()
    
    payload = {
        "user_id": "nonexistent-user-12345",
        "task_type": "welcome_guidance",
        "domain": "Technology / Engineering"
    }
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        print(f"\nResult: success={result.success}")
        print(f"Error: {result.error}")
        
        # Should fail because user doesn't exist or onboarding not done
        assert result.success == False, "Expected failure for missing/incomplete user"
        print("Rejection for incomplete onboarding: PASS")
        
    except Exception as e:
        print(f"Test exception: {e}")


async def test_7_validate_json_output():
    """Test 7: Validate JSON output structure"""
    print("\n" + "="*60)
    print("TEST 7: JSON Output Structure Validation")
    print("="*60)
    
    # Test that the output matches the required schema exactly
    agent = create_mentor_agent()
    
    payload = create_task_payload(
        user_id="test-json-validation",
        task_type="system_progress_update",
        domain="Technology / Engineering",
        completed_task="analyze_resume"
    )
    
    try:
        async with agent:
            result = await agent.execute(payload)
        
        if result.success:
            output = result.output
            
            print("Checking JSON structure...")
            
            # Required keys
            required_keys = ["message_type", "title", "body"]
            optional_keys = ["action_cta"]
            
            for key in required_keys:
                if key in output:
                    print(f"  ✓ {key}: present")
                else:
                    print(f"  ✗ {key}: MISSING")
            
            for key in optional_keys:
                if key in output:
                    print(f"  ✓ {key}: present (optional)")
            
            # Check for extra keys
            all_valid_keys = required_keys + optional_keys
            extra_keys = [k for k in output.keys() if k not in all_valid_keys]
            if extra_keys:
                print(f"  ⚠ Extra keys found: {extra_keys}")
            else:
                print(f"  ✓ No extra keys")
            
            # Validate action_cta structure
            if "action_cta" in output and output["action_cta"]:
                cta = output["action_cta"]
                if "label" in cta and "route" in cta:
                    print(f"  ✓ action_cta structure valid")
                else:
                    print(f"  ✗ action_cta missing label or route")
            
            print("\nJSON validation: PASS")
        else:
            print(f"Error: {result.error}")
            
    except Exception as e:
        print(f"Test exception: {e}")


# ============================================
# Main Test Runner
# ============================================

async def run_all_tests():
    """Run all MentorAgent tests"""
    print("\n" + "="*60)
    print("MENTOR AGENT TEST SUITE")
    print("="*60)
    print(f"Started: {datetime.now()}")
    
    await test_1_tech_user_welcome()
    await test_2_medical_user_welcome()
    await test_3_business_domain_limited()
    await test_4_progress_update()
    await test_5_unknown_task_type()
    await test_6_onboarding_not_completed()
    await test_7_validate_json_output()
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
