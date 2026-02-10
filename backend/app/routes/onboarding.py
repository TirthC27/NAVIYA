"""
Onboarding Routes
Handles user onboarding flow and supervisor initialization
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import httpx

from app.config import settings
from app.agents.supervisor import run_supervisor, SupervisorResult
from app.services.dashboard_state import get_dashboard_state_service


router = APIRouter(tags=["Onboarding"])


# ============================================
# Supabase REST Configuration
# ============================================

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

def get_headers():
    """Get headers for Supabase REST API calls"""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


# ============================================
# Request/Response Models
# ============================================

class OnboardingSaveRequest(BaseModel):
    user_id: str
    selected_domain: Optional[str] = None
    career_goal_raw: Optional[str] = None
    education_level: Optional[str] = None
    current_stage: Optional[str] = None
    self_assessed_level: Optional[str] = None
    weekly_hours: Optional[int] = 10
    primary_blocker: Optional[str] = None


class OnboardingCompleteRequest(BaseModel):
    user_id: str
    selected_domain: str
    career_goal_raw: Optional[str] = None
    education_level: str
    current_stage: Optional[str] = None
    self_assessed_level: str
    weekly_hours: int
    primary_blocker: str


class OnboardingStatusResponse(BaseModel):
    exists: bool
    onboarding_completed: bool
    supervisor_initialized: bool


# ============================================
# Routes
# ============================================

@router.get("/onboarding/status")
async def get_onboarding_status(user_id: str):
    """
    Check if user has completed onboarding
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=onboarding_completed,supervisor_initialized"
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return {
                        "exists": True,
                        "onboarding_completed": data[0].get("onboarding_completed", False),
                        "supervisor_initialized": data[0].get("supervisor_initialized", False)
                    }
            
            return {
                "exists": False,
                "onboarding_completed": False,
                "supervisor_initialized": False
            }
            
    except Exception as e:
        print(f"[ERR] Error checking onboarding status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/save")
async def save_onboarding_step(request: OnboardingSaveRequest):
    """
    Save/update onboarding progress (upsert)
    """
    try:
        async with httpx.AsyncClient() as client:
            # Check if user_context exists
            check_url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{request.user_id}&select=user_id"
            check_response = await client.get(check_url, headers=get_headers())
            
            # Build update data (only include non-None and non-empty fields)
            update_data = {"user_id": request.user_id}
            if request.selected_domain:
                update_data["selected_domain"] = request.selected_domain
            if request.career_goal_raw:
                update_data["career_goal_raw"] = request.career_goal_raw
            if request.education_level:
                update_data["education_level"] = request.education_level
            if request.current_stage:
                update_data["current_stage"] = request.current_stage
            if request.self_assessed_level:
                update_data["self_assessed_level"] = request.self_assessed_level
            if request.weekly_hours is not None:
                update_data["weekly_hours"] = request.weekly_hours
            if request.primary_blocker:
                update_data["primary_blocker"] = request.primary_blocker
            
            if check_response.status_code == 200 and check_response.json():
                # Update existing row
                update_url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{request.user_id}"
                response = await client.patch(update_url, headers=get_headers(), json=update_data)
            else:
                # Insert new row
                insert_url = f"{SUPABASE_REST_URL}/user_context"
                response = await client.post(insert_url, headers=get_headers(), json=update_data)
            
            if response.status_code not in [200, 201]:
                print(f"[ERR] Save error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to save onboarding data")
            
            return {"success": True, "message": "Progress saved"}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Error saving onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/complete")
async def complete_onboarding(request: OnboardingCompleteRequest):
    """
    Complete onboarding and trigger supervisor initialization
    """
    try:
        async with httpx.AsyncClient() as client:
            # Final upsert with onboarding_completed = true
            update_data = {
                "user_id": request.user_id,
                "selected_domain": request.selected_domain,
                "education_level": request.education_level,
                "self_assessed_level": request.self_assessed_level,
                "weekly_hours": request.weekly_hours,
                "primary_blocker": request.primary_blocker,
                "onboarding_completed": True
            }
            # Only include optional fields if provided
            if request.career_goal_raw:
                update_data["career_goal_raw"] = request.career_goal_raw
            if request.current_stage:
                update_data["current_stage"] = request.current_stage
            
            # Check if exists
            check_url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{request.user_id}&select=user_id"
            check_response = await client.get(check_url, headers=get_headers())
            
            if check_response.status_code == 200 and check_response.json():
                # Update
                update_url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{request.user_id}"
                response = await client.patch(update_url, headers=get_headers(), json=update_data)
            else:
                # Insert
                insert_url = f"{SUPABASE_REST_URL}/user_context"
                response = await client.post(insert_url, headers=get_headers(), json=update_data)
            
            if response.status_code not in [200, 201]:
                print(f"[ERR] Complete error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to complete onboarding")
            
            print(f"[OK] Onboarding completed for user: {request.user_id}")
            
            # Initialize dashboard_state for new user
            dashboard_service = get_dashboard_state_service()
            await dashboard_service.initialize_state(
                user_id=request.user_id,
                domain=request.selected_domain
            )
            print(f"[OK] Dashboard state initialized for user: {request.user_id}")
            
            # Trigger SupervisorAgent (the new orchestrator)
            result = await run_supervisor(request.user_id)
            
            if not result.success:
                print(f"[WARN] SupervisorAgent warning: {result.error}")
                # Don't fail the request - user can still proceed
            
            return {
                "success": True, 
                "message": "Onboarding completed",
                "supervisor_result": {
                    "domain_supported": result.domain_supported,
                    "limited_mode": result.limited_mode,
                    "tasks_created": len(result.tasks_created)
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Error completing onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding/context/{user_id}")
async def get_user_context(user_id: str):
    """
    Get full user context (for agents)
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=*"
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            
            raise HTTPException(status_code=404, detail="User context not found")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Error getting user context: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Supervisor Endpoints
# ============================================

@router.post("/onboarding/run-supervisor/{user_id}")
async def run_supervisor_for_user(user_id: str):
    """
    Manually trigger SupervisorAgent for a user.
    Useful for testing or recovery.
    """
    try:
        result = await run_supervisor(user_id)
        return {
            "success": result.success,
            "domain_supported": result.domain_supported,
            "limited_mode": result.limited_mode,
            "current_phase": result.current_phase,
            "tasks_created": result.tasks_created,
            "error": result.error
        }
    except Exception as e:
        print(f"[ERR] Error running supervisor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/check-pending-supervisors")
async def check_pending_supervisors():
    """
    Periodic check for users who completed onboarding but supervisor not initialized
    Can be called by a cron job or webhook
    """
    try:
        async with httpx.AsyncClient() as client:
            # Find users with completed onboarding but no supervisor init
            url = f"{SUPABASE_REST_URL}/user_context?onboarding_completed=eq.true&supervisor_initialized=eq.false&select=user_id"
            response = await client.get(url, headers=get_headers())
            
            if response.status_code == 200:
                pending_users = response.json()
                results = []
                
                for user in pending_users:
                    result = await run_supervisor(user["user_id"])
                    results.append({
                        "user_id": user["user_id"],
                        "success": result.success,
                        "tasks_created": len(result.tasks_created)
                    })
                
                return {
                    "success": True,
                    "processed": len(pending_users),
                    "results": results
                }
            
            return {"success": True, "processed": 0}
            
    except Exception as e:
        print(f"[ERR] Error checking pending supervisors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding/dashboard-state/{user_id}")
async def get_dashboard_state(user_id: str):
    """
    Get complete dashboard state including:
    - User context (onboarding data)
    - Agent tasks status
    - Whether to show "setting up" state
    """
    try:
        async with httpx.AsyncClient() as client:
            # Get user context
            context_url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=*"
            context_response = await client.get(context_url, headers=get_headers())
            
            if context_response.status_code != 200:
                raise HTTPException(status_code=404, detail="User context not found")
            
            context_data = context_response.json()
            if not context_data:
                raise HTTPException(status_code=404, detail="User context not found")
            
            user_context = context_data[0]
            
            # Get agent tasks
            tasks_url = f"{SUPABASE_REST_URL}/agent_tasks?user_id=eq.{user_id}&select=*"
            tasks_response = await client.get(tasks_url, headers=get_headers())
            
            agent_tasks = []
            if tasks_response.status_code == 200:
                agent_tasks = tasks_response.json()
            
            # Determine state
            has_tasks = len(agent_tasks) > 0
            any_completed = any(task["status"] == "completed" for task in agent_tasks)
            all_pending_or_running = all(task["status"] in ["pending", "running"] for task in agent_tasks)
            
            # If tasks exist but none completed → "setting up" state
            is_setting_up = has_tasks and not any_completed
            
            return {
                "user_context": user_context,
                "agent_tasks": agent_tasks,
                "is_setting_up": is_setting_up,
                "show_full_dashboard": not is_setting_up,
                "tasks_summary": {
                    "total": len(agent_tasks),
                    "pending": len([t for t in agent_tasks if t["status"] == "pending"]),
                    "running": len([t for t in agent_tasks if t["status"] == "running"]),
                    "completed": len([t for t in agent_tasks if t["status"] == "completed"]),
                    "failed": len([t for t in agent_tasks if t["status"] == "failed"])
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERR] Error getting dashboard state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
