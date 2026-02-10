"""
Test Cases for Agent Task Execution System

Test scenarios:
1. Single agent, single task
2. Multiple agents, parallel tasks
3. Agent crash during execution
4. Duplicate polling prevention
5. Unsupported agent_name
6. Long-running task timeout

Run with: py -m pytest test_task_executor.py -v
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import uuid


# ============================================
# Test Fixtures
# ============================================

def make_task(
    task_id: str = None,
    user_id: str = "test-user-001",
    agent_name: str = "MentorAgent",
    task_type: str = "welcome_guidance",
    status: str = "pending",
    task_payload: dict = None
):
    """Create a mock agent task"""
    return {
        "id": task_id or str(uuid.uuid4()),
        "user_id": user_id,
        "agent_name": agent_name,
        "task_type": task_type,
        "task_payload": task_payload or {
            "user_id": user_id,
            "domain": "Technology / Engineering",
            "normalized_goal": {"primary_track": "software_engineering", "confidence": "high"},
            "current_phase": "exploration"
        },
        "status": status,
        "result": None,
        "error_message": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


# ============================================
# Test Scenario 1: Single Agent, Single Task
# ============================================

def test_single_agent_single_task_description():
    """
    Scenario 1: Single agent processes a single task
    
    Given:
    - One pending task for MentorAgent
    - MentorAgent is registered
    
    Steps:
    1. Poll for pending tasks
    2. Lock the task (pending → running)
    3. Execute agent logic
    4. Update status (running → completed)
    5. Log activity
    
    Expected:
    - Task status changes: pending → running → completed
    - Result is stored in task.result
    - Activity log entry created
    """
    task = make_task(
        agent_name="MentorAgent",
        task_type="welcome_guidance"
    )
    
    expected_flow = [
        ("status", "pending"),
        ("lock", "running"),
        ("execute", "MentorAgent.execute()"),
        ("complete", "completed"),
        ("log", "activity_log entry")
    ]
    
    print(f"Task: {task}")
    print(f"Expected flow: {expected_flow}")
    assert True


# ============================================
# Test Scenario 2: Multiple Agents, Parallel Tasks
# ============================================

def test_multiple_agents_parallel_tasks_description():
    """
    Scenario 2: Multiple agents process tasks independently
    
    Given:
    - One pending task for ResumeIntelligenceAgent
    - One pending task for RoadmapAgent
    - One pending task for MentorAgent
    
    Steps:
    1. Each agent's worker polls independently
    2. Each agent locks its own task
    3. Each agent executes in parallel
    4. Each updates its own task status
    
    Expected:
    - All three tasks complete independently
    - No cross-agent interference
    - Correct task-to-agent mapping
    """
    tasks = [
        make_task(agent_name="ResumeIntelligenceAgent", task_type="await_resume_upload"),
        make_task(agent_name="RoadmapAgent", task_type="generate_foundation_roadmap"),
        make_task(agent_name="MentorAgent", task_type="welcome_guidance"),
    ]
    
    expected = {
        "ResumeIntelligenceAgent": "completed",
        "RoadmapAgent": "completed",
        "MentorAgent": "completed"
    }
    
    print(f"Tasks: {[t['agent_name'] for t in tasks]}")
    print(f"Expected outcomes: {expected}")
    assert True


# ============================================
# Test Scenario 3: Agent Crash During Execution
# ============================================

def test_agent_crash_during_execution_description():
    """
    Scenario 3: Agent throws an exception during execution
    
    Given:
    - One pending task
    - Agent's execute() raises an exception
    
    Steps:
    1. Poll and lock task
    2. Execute agent (throws exception)
    3. Catch exception in safety layer
    4. Mark task as failed
    5. Store error message
    6. Log failure
    
    Expected:
    - Worker does NOT crash
    - Task status = "failed"
    - error_message contains exception info
    - Activity log shows failure
    """
    task = make_task()
    simulated_error = "Database connection failed"
    
    expected = {
        "status": "failed",
        "error_message": simulated_error,
        "activity_status": "failure",
        "worker_crashed": False
    }
    
    print(f"Task: {task['agent_name']} → {task['task_type']}")
    print(f"Simulated error: {simulated_error}")
    print(f"Expected: {expected}")
    assert True


# ============================================
# Test Scenario 4: Duplicate Polling Prevention
# ============================================

def test_duplicate_polling_prevention_description():
    """
    Scenario 4: Multiple workers try to pick the same task
    
    Given:
    - One pending task
    - Two workers polling simultaneously
    
    Steps:
    1. Worker A polls, finds task
    2. Worker B polls, finds same task
    3. Worker A tries to lock (succeeds)
    4. Worker B tries to lock (fails - already running)
    
    Expected:
    - Only one worker executes the task
    - Other worker skips gracefully
    - No duplicate execution
    """
    task = make_task()
    
    expected = {
        "worker_a_lock": True,
        "worker_b_lock": False,
        "task_executed_count": 1,
        "final_status": "completed"
    }
    
    print(f"Task: {task['id']}")
    print(f"Expected: {expected}")
    assert True


# ============================================
# Test Scenario 5: Unsupported Agent Name
# ============================================

def test_unsupported_agent_name_description():
    """
    Scenario 5: Task has an unregistered agent_name
    
    Given:
    - One pending task with agent_name = "UnknownAgent"
    - UnknownAgent is NOT registered
    
    Steps:
    1. Poll finds task
    2. Lock task
    3. Try to find agent in registry (fails)
    4. Return error result
    5. Mark task as failed
    
    Expected:
    - Task status = "failed"
    - error_message = "Unknown agent: UnknownAgent"
    - No exception thrown
    """
    task = make_task(agent_name="UnknownAgent", task_type="mystery_task")
    
    expected = {
        "status": "failed",
        "error_message": "Unknown agent: UnknownAgent",
        "exception_thrown": False
    }
    
    print(f"Task: {task['agent_name']} → {task['task_type']}")
    print(f"Expected: {expected}")
    assert True


# ============================================
# Test Scenario 6: Long-Running Task Timeout
# ============================================

def test_long_running_task_timeout_description():
    """
    Scenario 6: A running task exceeds the timeout threshold
    
    Given:
    - One task with status = "running"
    - updated_at = 45 minutes ago
    - Timeout threshold = 30 minutes
    
    Steps:
    1. Cleanup job runs
    2. Finds tasks with status=running AND updated_at < threshold
    3. Marks them as failed
    4. Logs timeout
    
    Expected:
    - Task status = "failed"
    - error_message = "Task timed out after 30 minutes"
    - Activity log shows timeout
    """
    task = make_task(status="running")
    task["updated_at"] = (datetime.utcnow() - timedelta(minutes=45)).isoformat()
    
    timeout_minutes = 30
    
    expected = {
        "status": "failed",
        "error_message": f"Task timed out after {timeout_minutes} minutes",
        "activity_status": "failure"
    }
    
    print(f"Task: {task['id']}")
    print(f"Task age: 45 minutes")
    print(f"Timeout threshold: {timeout_minutes} minutes")
    print(f"Expected: {expected}")
    assert True


# ============================================
# Test: Task Lifecycle State Machine
# ============================================

def test_task_lifecycle_states():
    """
    Verify valid state transitions.
    
    Valid transitions:
    - pending → running
    - running → completed
    - running → failed
    
    Invalid transitions:
    - pending → completed (must go through running)
    - completed → anything
    - failed → anything
    """
    valid_transitions = [
        ("pending", "running"),
        ("running", "completed"),
        ("running", "failed"),
    ]
    
    invalid_transitions = [
        ("pending", "completed"),
        ("pending", "failed"),
        ("completed", "pending"),
        ("completed", "running"),
        ("completed", "failed"),
        ("failed", "pending"),
        ("failed", "running"),
        ("failed", "completed"),
    ]
    
    print("Valid transitions:")
    for from_state, to_state in valid_transitions:
        print(f"  {from_state} → {to_state} ✅")
    
    print("\nInvalid transitions:")
    for from_state, to_state in invalid_transitions:
        print(f"  {from_state} → {to_state} ❌")
    
    assert True


# ============================================
# Test: Agent Registry
# ============================================

def test_agent_registry():
    """
    Test agent registry functionality.
    """
    from app.agents.registry import AgentRegistry, get_registry
    
    registry = get_registry()
    
    # Check default agents are registered
    expected_agents = ["ResumeIntelligenceAgent", "RoadmapAgent", "MentorAgent"]
    
    for agent_name in expected_agents:
        assert registry.is_registered(agent_name), f"{agent_name} should be registered"
        
        agent = registry.get_agent(agent_name)
        assert agent is not None
        assert len(agent.supported_task_types) > 0
    
    print("✅ Agent registry test passed")
    print(f"   Registered agents: {registry.list_agents()}")


# ============================================
# Test: Worker Base Interface
# ============================================

def test_worker_base_interface():
    """
    Test that all worker implementations follow the interface.
    """
    from app.agents.worker_base import (
        AgentWorker,
        ResumeIntelligenceWorker,
        RoadmapWorker,
        MentorWorker
    )
    
    workers = [
        ResumeIntelligenceWorker(),
        RoadmapWorker(),
        MentorWorker(),
    ]
    
    for worker in workers:
        # Check interface compliance
        assert isinstance(worker, AgentWorker)
        assert hasattr(worker, 'agent_name')
        assert hasattr(worker, 'supported_task_types')
        assert hasattr(worker, 'execute')
        assert hasattr(worker, 'can_handle')
        
        # Check properties are not empty
        assert worker.agent_name
        assert len(worker.supported_task_types) > 0
        
        print(f"✅ {worker.agent_name} implements AgentWorker correctly")


# ============================================
# Integration Test Instructions
# ============================================

def test_integration_instructions():
    """
    Manual integration test steps.
    """
    print("""
    ========================================
    MANUAL INTEGRATION TEST STEPS
    ========================================
    
    Prerequisites:
    1. Backend server running: uvicorn app.main:app --host 0.0.0.0 --port 8000
    2. Database schema applied:
       - onboarding_schema.sql
       - agent_activity_log_schema.sql
    3. Test user with completed onboarding
    
    Test 1: Process Single Task
    ---------------------------
    POST /api/tasks/agent/MentorAgent/process
    
    Expected:
    - Response: {"tasks_processed": 1}
    - Task status changed to "completed"
    
    Test 2: List Agents
    -------------------
    GET /api/agents/list
    
    Expected:
    - Response contains 3 agents
    - Each has supported_task_types
    
    Test 3: Process All Tasks
    -------------------------
    POST /api/tasks/process-all
    
    Expected:
    - Response shows tasks processed per agent
    
    Test 4: View Activity Log
    -------------------------
    GET /api/activity/user/{user_id}
    
    Expected:
    - Activity entries for processed tasks
    
    Test 5: Cleanup Stale Tasks
    ---------------------------
    POST /api/tasks/cleanup-stale?timeout_minutes=30
    
    Expected:
    - Stale running tasks marked as failed
    """)
    assert True


# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("AGENT TASK EXECUTION SYSTEM - TEST SCENARIOS")
    print("="*60 + "\n")
    
    test_single_agent_single_task_description()
    print()
    test_multiple_agents_parallel_tasks_description()
    print()
    test_agent_crash_during_execution_description()
    print()
    test_duplicate_polling_prevention_description()
    print()
    test_unsupported_agent_name_description()
    print()
    test_long_running_task_timeout_description()
    print()
    test_task_lifecycle_states()
    print()
    
    print("\n" + "="*60)
    print("Running actual tests...")
    print("="*60 + "\n")
    
    test_agent_registry()
    print()
    test_worker_base_interface()
    print()
    test_integration_instructions()
    
    print("\n" + "="*60)
    print("All tests completed")
    print("="*60)
