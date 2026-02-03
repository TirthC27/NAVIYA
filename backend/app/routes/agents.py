"""
Agent Task Routes

API endpoints for:
- Manual task execution
- Task status queries
- Activity log queries
- Worker management
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import httpx

from app.config import settings
from app.agents.registry import get_registry
from app.agents.task_executor import (
    TaskExecutor,
    process_pending_tasks,
    process_all_pending_tasks,
    cleanup_stale_tasks
)


router = APIRouter(tags=["Agent Tasks"])


# ============================================
# Configuration
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
# Request/Response Models
# ============================================

class TaskStatusResponse(BaseModel):
    id: str
    user_id: str
    agent_name: str
    task_type: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    agent_name: str
    task_type: str
    status: str
    execution_time_ms: int
    summary: str
    created_at: str


class AgentInfoResponse(BaseModel):
    agent_name: str
    supported_task_types: List[str]
    output_tables: List[str]


# ============================================
# Agent Registry Endpoints
# ============================================

@router.get("/agents/list")
async def list_agents():
    """
    List all registered agents and their capabilities.
    """
    registry = get_registry()
    agents = registry.list_agent_details()
    
    return {
        "agents": agents,
        "count": len(agents)
    }


@router.get("/agents/{agent_name}/info")
async def get_agent_info(agent_name: str):
    """
    Get detailed info about a specific agent.
    """
    registry = get_registry()
    agent = registry.get_agent(agent_name)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")
    
    return {
        "agent_name": agent.agent_name,
        "supported_task_types": agent.supported_task_types,
        "output_tables": agent.output_tables
    }


# ============================================
# Task Query Endpoints
# ============================================

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    Get the status of a specific task.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_REST_URL}/agent_tasks?id=eq.{task_id}&select=*"
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                tasks = response.json()
                if tasks:
                    return tasks[0]
            
            raise HTTPException(status_code=404, detail="Task not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/user/{user_id}")
async def get_user_tasks(
    user_id: str,
    status: Optional[str] = None,
    limit: int = 50
):
    """
    Get all tasks for a specific user.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_REST_URL}/agent_tasks?user_id=eq.{user_id}&order=created_at.desc&limit={limit}&select=*"
            
            if status:
                url += f"&status=eq.{status}"
            
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                return {
                    "tasks": response.json(),
                    "count": len(response.json())
                }
            
            raise HTTPException(status_code=500, detail="Failed to fetch tasks")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/agent/{agent_name}/pending")
async def get_pending_tasks(agent_name: str, limit: int = 10):
    """
    Get pending tasks for a specific agent.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = (
                f"{SUPABASE_REST_URL}/agent_tasks"
                f"?agent_name=eq.{agent_name}"
                f"&status=eq.pending"
                f"&order=created_at.asc"
                f"&limit={limit}"
                f"&select=*"
            )
            
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                return {
                    "tasks": response.json(),
                    "count": len(response.json())
                }
            
            raise HTTPException(status_code=500, detail="Failed to fetch tasks")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Task Execution Endpoints
# ============================================

@router.post("/tasks/{task_id}/execute")
async def execute_single_task(task_id: str, background_tasks: BackgroundTasks):
    """
    Manually execute a specific pending task.
    """
    try:
        async with TaskExecutor() as executor:
            # Fetch the task
            async with httpx.AsyncClient() as client:
                url = f"{SUPABASE_REST_URL}/agent_tasks?id=eq.{task_id}&select=*"
                response = await client.get(url, headers=get_headers())
                
                if response.status_code != 200 or not response.json():
                    raise HTTPException(status_code=404, detail="Task not found")
                
                task_data = response.json()[0]
            
            # Check if task is pending
            if task_data["status"] != "pending":
                raise HTTPException(
                    status_code=400,
                    detail=f"Task is not pending (status: {task_data['status']})"
                )
            
            # Import here to avoid circular import
            from app.agents.task_executor import AgentTask
            task = AgentTask(**task_data)
            
            # Execute the task
            success = await executor.process_task(task)
            
            return {
                "success": success,
                "task_id": task_id,
                "message": "Task executed" if success else "Task execution failed"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/agent/{agent_name}/process")
async def process_agent_tasks(
    agent_name: str,
    limit: int = 1,
    background_tasks: BackgroundTasks = None
):
    """
    Process pending tasks for a specific agent.
    """
    try:
        processed = await process_pending_tasks(agent_name, limit)
        
        return {
            "agent_name": agent_name,
            "tasks_processed": processed,
            "message": f"Processed {processed} task(s)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/process-all")
async def process_all_tasks(limit_per_agent: int = 1):
    """
    Process pending tasks for all registered agents.
    """
    try:
        results = await process_all_pending_tasks(limit_per_agent)
        
        total = sum(results.values())
        
        return {
            "results": results,
            "total_processed": total,
            "message": f"Processed {total} task(s) across {len(results)} agent(s)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/cleanup-stale")
async def cleanup_stale_tasks_endpoint(timeout_minutes: int = 30):
    """
    Clean up stale running tasks (mark as failed).
    """
    try:
        cleaned = await cleanup_stale_tasks(timeout_minutes)
        
        return {
            "tasks_cleaned": cleaned,
            "timeout_minutes": timeout_minutes,
            "message": f"Cleaned up {cleaned} stale task(s)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Activity Log Endpoints
# ============================================

@router.get("/activity/user/{user_id}")
async def get_user_activity(user_id: str, limit: int = 50):
    """
    Get activity log for a specific user.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = (
                f"{SUPABASE_REST_URL}/agent_activity_log"
                f"?user_id=eq.{user_id}"
                f"&order=created_at.desc"
                f"&limit={limit}"
                f"&select=*"
            )
            
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                return {
                    "activity": response.json(),
                    "count": len(response.json())
                }
            
            # Table might not exist yet
            return {"activity": [], "count": 0}
            
    except Exception as e:
        print(f"⚠️ Activity log query failed: {str(e)}")
        return {"activity": [], "count": 0}


@router.get("/activity/agent/{agent_name}")
async def get_agent_activity(agent_name: str, limit: int = 50):
    """
    Get activity log for a specific agent.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = (
                f"{SUPABASE_REST_URL}/agent_activity_log"
                f"?agent_name=eq.{agent_name}"
                f"&order=created_at.desc"
                f"&limit={limit}"
                f"&select=*"
            )
            
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                return {
                    "activity": response.json(),
                    "count": len(response.json())
                }
            
            return {"activity": [], "count": 0}
            
    except Exception as e:
        print(f"⚠️ Activity log query failed: {str(e)}")
        return {"activity": [], "count": 0}


@router.get("/activity/stats")
async def get_activity_stats():
    """
    Get aggregate activity statistics.
    """
    try:
        async with httpx.AsyncClient() as client:
            # Get performance view
            url = f"{SUPABASE_REST_URL}/v_agent_performance?select=*"
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                return {
                    "performance": response.json()
                }
            
            return {"performance": []}
            
    except Exception as e:
        print(f"⚠️ Stats query failed: {str(e)}")
        return {"performance": []}
