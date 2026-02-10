"""
Task Executor

Handles task lifecycle:
- Polling for pending tasks
- Locking tasks for execution
- Running agent logic
- Updating task status
- Logging activity
"""

import httpx
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import traceback
import time

from app.config import settings
from app.agents.registry import get_registry, AgentRegistry
from app.agents.worker_base import AgentWorker, TaskResult


# ============================================
# Configuration
# ============================================

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

# Timeout for running tasks (minutes)
TASK_TIMEOUT_MINUTES = 30

# Polling interval (seconds)
DEFAULT_POLL_INTERVAL = 5


def get_headers():
    """Get headers for Supabase REST API calls"""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


# ============================================
# Task Data Models
# ============================================

class AgentTask(BaseModel):
    """Task from agent_tasks table"""
    id: str
    user_id: str
    agent_name: str
    task_type: str
    task_payload: Dict[str, Any]
    status: str
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ActivityLogEntry(BaseModel):
    """Entry for agent_activity_log"""
    user_id: str
    agent_name: str
    task_id: str
    task_type: str
    status: str  # "success" | "failure"
    execution_time_ms: int
    summary: str
    error_details: Optional[str] = None
    
    def to_db_dict(self) -> dict:
        """Convert to dict for database, excluding missing optional columns"""
        data = {
            "user_id": self.user_id,
            "agent_name": self.agent_name,
            "task_id": self.task_id,
            "task_type": self.task_type,
            "status": self.status,
            "execution_time_ms": self.execution_time_ms,
            "summary": self.summary
        }
        # Only include error_details if it has a value
        if self.error_details:
            data["error_details"] = self.error_details
        return data


# ============================================
# Task Executor Class
# ============================================

class TaskExecutor:
    """
    Executes agent tasks with proper lifecycle management.
    
    Lifecycle: pending → running → completed | failed
    
    Features:
    - Task polling with ordering
    - Atomic status transitions
    - Safe execution with error handling
    - Activity logging
    """
    
    def __init__(self, registry: Optional[AgentRegistry] = None):
        self.registry = registry or get_registry()
        self.client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    # ============================================
    # Task Polling
    # ============================================
    
    async def poll_pending_task(self, agent_name: str) -> Optional[AgentTask]:
        """
        Poll for a single pending task for a specific agent.
        
        Rules:
        - Fetch tasks with status = "pending"
        - Filter by agent_name
        - Order by created_at ASC (oldest first)
        - Limit to 1 task per poll
        
        Args:
            agent_name: Name of the agent to poll for
            
        Returns:
            AgentTask if found, None otherwise
        """
        try:
            url = (
                f"{SUPABASE_REST_URL}/agent_tasks"
                f"?agent_name=eq.{agent_name}"
                f"&status=eq.pending"
                f"&order=created_at.asc"
                f"&limit=1"
                f"&select=*"
            )
            
            response = await self.client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                tasks = response.json()
                if tasks and len(tasks) > 0:
                    return AgentTask(**tasks[0])
            
            return None
            
        except Exception as e:
            print(f"[ERR] Error polling tasks: {str(e)}")
            return None
    
    async def poll_all_pending_tasks(self, agent_name: str, limit: int = 10) -> List[AgentTask]:
        """
        Poll for multiple pending tasks for an agent.
        
        Args:
            agent_name: Name of the agent
            limit: Maximum number of tasks to return
            
        Returns:
            List of pending AgentTasks
        """
        try:
            url = (
                f"{SUPABASE_REST_URL}/agent_tasks"
                f"?agent_name=eq.{agent_name}"
                f"&status=eq.pending"
                f"&order=created_at.asc"
                f"&limit={limit}"
                f"&select=*"
            )
            
            response = await self.client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                tasks = response.json()
                return [AgentTask(**task) for task in tasks]
            
            return []
            
        except Exception as e:
            print(f"[ERR] Error polling tasks: {str(e)}")
            return []
    
    # ============================================
    # Task Locking (Status Transitions)
    # ============================================
    
    async def try_lock_task(self, task_id: str) -> bool:
        """
        Attempt to lock a task by transitioning it from pending to running.
        
        Uses optimistic locking - only updates if status is still pending.
        This prevents multiple workers from picking the same task.
        
        Args:
            task_id: ID of the task to lock
            
        Returns:
            True if lock acquired, False otherwise
        """
        try:
            # Atomic update: only change if still pending
            url = f"{SUPABASE_REST_URL}/agent_tasks?id=eq.{task_id}&status=eq.pending"
            
            response = await self.client.patch(
                url,
                headers=get_headers(),
                json={"status": "running"}
            )
            
            # Check if any rows were updated
            if response.status_code == 200:
                updated = response.json()
                return len(updated) > 0
            
            return False
            
        except Exception as e:
            print(f"[ERR] Error locking task: {str(e)}")
            return False
    
    async def complete_task(self, task_id: str, result: Dict[str, Any]) -> bool:
        """
        Mark a task as completed with its result.
        
        Args:
            task_id: ID of the task
            result: Result data from agent execution
            
        Returns:
            True if updated successfully
        """
        try:
            url = f"{SUPABASE_REST_URL}/agent_tasks?id=eq.{task_id}"
            
            response = await self.client.patch(
                url,
                headers=get_headers(),
                json={
                    "status": "completed",
                    "result": result
                }
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"[ERR] Error completing task: {str(e)}")
            return False
    
    async def fail_task(self, task_id: str, error_message: str) -> bool:
        """
        Mark a task as failed with an error message.
        
        Args:
            task_id: ID of the task
            error_message: Description of the failure
            
        Returns:
            True if updated successfully
        """
        try:
            url = f"{SUPABASE_REST_URL}/agent_tasks?id=eq.{task_id}"
            
            response = await self.client.patch(
                url,
                headers=get_headers(),
                json={
                    "status": "failed",
                    "error_message": error_message
                }
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"[ERR] Error failing task: {str(e)}")
            return False
    
    # ============================================
    # Task Execution
    # ============================================
    
    async def execute_task(self, task: AgentTask) -> TaskResult:
        """
        Execute a single task using the appropriate agent.
        
        This method:
        1. Finds the agent worker
        2. Validates the payload
        3. Executes the agent logic
        4. Returns the result
        
        Note: This does NOT update task status - caller handles that.
        
        Args:
            task: The task to execute
            
        Returns:
            TaskResult from agent execution
        """
        start_time = time.time()
        
        # Find the agent
        agent = self.registry.get_agent(task.agent_name)
        if not agent:
            return TaskResult(
                success=False,
                error=f"Unknown agent: {task.agent_name}",
                summary=f"Agent '{task.agent_name}' not registered"
            )
        
        # Check if agent can handle this task type
        if not agent.can_handle(task.task_type):
            return TaskResult(
                success=False,
                error=f"Agent {task.agent_name} cannot handle task type: {task.task_type}",
                summary=f"Unsupported task type: {task.task_type}"
            )
        
        # Add task_type to payload for agent reference
        payload = {**task.task_payload, "task_type": task.task_type, "task_id": task.id}
        
        # Validate payload
        validation_error = await agent.validate_payload(payload)
        if validation_error:
            return TaskResult(
                success=False,
                error=validation_error,
                summary=f"Validation failed: {validation_error}"
            )
        
        # Execute the agent
        try:
            result = await agent.execute(payload)
            result.execution_time_ms = int((time.time() - start_time) * 1000)
            return result
            
        except Exception as e:
            error_detail = traceback.format_exc()
            return TaskResult(
                success=False,
                error=str(e),
                summary=f"Execution error: {str(e)}",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
    
    async def process_task(self, task: AgentTask) -> bool:
        """
        Process a single task through the full lifecycle.
        
        Steps:
        1. Try to lock the task (pending → running)
        2. Execute the agent logic
        3. Update task status (running → completed|failed)
        4. Log the activity
        
        Args:
            task: The task to process
            
        Returns:
            True if task was processed successfully
        """
        print(f"\n[TASK] Processing task: {task.agent_name} -> {task.task_type}")
        
        # Step 1: Lock the task
        locked = await self.try_lock_task(task.id)
        if not locked:
            print(f"   [WARN] Could not lock task (already running or completed)")
            return False
        
        print(f"   [LOCK] Task locked")
        
        # Step 2: Execute
        start_time = time.time()
        result = await self.execute_task(task)
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Step 3: Update status
        if result.success:
            await self.complete_task(task.id, result.output)
            print(f"   [OK] Task completed ({execution_time_ms}ms)")
        else:
            await self.fail_task(task.id, result.error or "Unknown error")
            print(f"   [ERR] Task failed: {result.error}")
        
        # Step 4: Log activity
        await self.log_activity(ActivityLogEntry(
            user_id=task.user_id,
            agent_name=task.agent_name,
            task_id=task.id,
            task_type=task.task_type,
            status="success" if result.success else "failure",
            execution_time_ms=execution_time_ms,
            summary=result.summary,
            error_details=result.error if not result.success else None
        ))
        
        return result.success
    
    # ============================================
    # Activity Logging
    # ============================================
    
    async def log_activity(self, entry: ActivityLogEntry) -> bool:
        """
        Log an activity entry to agent_activity_log.
        
        Args:
            entry: Activity log entry
            
        Returns:
            True if logged successfully
        """
        try:
            url = f"{SUPABASE_REST_URL}/agent_activity_log"
            
            response = await self.client.post(
                url,
                headers=get_headers(),
                json=entry.to_db_dict()
            )
            
            if response.status_code in [200, 201]:
                return True
            else:
                # Don't fail if logging fails - just warn
                print(f"   [WARN] Failed to log activity: {response.text}")
                return False
                
        except Exception as e:
            print(f"   [WARN] Failed to log activity: {str(e)}")
            return False
    
    # ============================================
    # Timeout Handling
    # ============================================
    
    async def timeout_stale_tasks(self, timeout_minutes: int = TASK_TIMEOUT_MINUTES) -> int:
        """
        Mark running tasks older than timeout as failed.
        
        Args:
            timeout_minutes: Minutes after which a running task is considered stale
            
        Returns:
            Number of tasks timed out
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)
            cutoff_str = cutoff_time.isoformat()
            
            # Find stale running tasks
            url = (
                f"{SUPABASE_REST_URL}/agent_tasks"
                f"?status=eq.running"
                f"&updated_at=lt.{cutoff_str}"
                f"&select=id,agent_name,task_type,user_id"
            )
            
            response = await self.client.get(url, headers=get_headers())
            
            if response.status_code != 200:
                return 0
            
            stale_tasks = response.json()
            
            for task in stale_tasks:
                # Mark as failed
                await self.fail_task(
                    task["id"],
                    f"Task timed out after {timeout_minutes} minutes"
                )
                
                # Log the timeout
                await self.log_activity(ActivityLogEntry(
                    user_id=task["user_id"],
                    agent_name=task["agent_name"],
                    task_id=task["id"],
                    task_type=task["task_type"],
                    status="failure",
                    execution_time_ms=timeout_minutes * 60 * 1000,
                    summary=f"Task timed out after {timeout_minutes} minutes",
                    error_details="Execution timeout"
                ))
                
                print(f"[TIMEOUT] Timed out task: {task['agent_name']} -> {task['task_type']}")
            
            return len(stale_tasks)
            
        except Exception as e:
            print(f"[ERR] Error timing out tasks: {str(e)}")
            return 0


# ============================================
# Public API Functions
# ============================================

async def process_pending_tasks(agent_name: str, limit: int = 1) -> int:
    """
    Process pending tasks for a specific agent.
    
    Args:
        agent_name: Name of the agent
        limit: Maximum number of tasks to process
        
    Returns:
        Number of tasks processed
    """
    async with TaskExecutor() as executor:
        tasks = await executor.poll_all_pending_tasks(agent_name, limit)
        
        processed = 0
        for task in tasks:
            success = await executor.process_task(task)
            if success:
                processed += 1
        
        return processed


async def process_all_pending_tasks(limit_per_agent: int = 1) -> Dict[str, int]:
    """
    Process pending tasks for all registered agents.
    
    Args:
        limit_per_agent: Maximum tasks per agent
        
    Returns:
        Dict of agent_name → tasks processed
    """
    registry = get_registry()
    results = {}
    
    async with TaskExecutor(registry) as executor:
        for agent_name in registry.list_agents():
            tasks = await executor.poll_all_pending_tasks(agent_name, limit_per_agent)
            
            processed = 0
            for task in tasks:
                success = await executor.process_task(task)
                if success:
                    processed += 1
            
            results[agent_name] = processed
    
    return results


async def cleanup_stale_tasks(timeout_minutes: int = TASK_TIMEOUT_MINUTES) -> int:
    """
    Clean up stale running tasks.
    
    Args:
        timeout_minutes: Timeout threshold
        
    Returns:
        Number of tasks cleaned up
    """
    async with TaskExecutor() as executor:
        return await executor.timeout_stale_tasks(timeout_minutes)
