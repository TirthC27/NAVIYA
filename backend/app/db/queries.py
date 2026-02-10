"""
Naviya AI - Database Queries for Progressive Learning
Handles learning steps, progress tracking, and user state
"""

from typing import Optional, List, Dict
from datetime import datetime
import json

from app.db.supabase_client import get_supabase_client, SupabaseError


# ============================================
# Learning Plan Operations
# ============================================
async def create_learning_plan(
    user_id: str,
    topic: str,
    difficulty: str,
    depth_level: int,
    learning_steps: List[Dict]
) -> Dict:
    """
    Create a new learning plan with steps.
    """
    try:
        supabase = get_supabase_client()
        
        # Create the plan
        plan_data = {
            "user_id": user_id,
            "topic": topic,
            "difficulty": difficulty,
            "depth_level": depth_level,
            "total_steps": len(learning_steps),
            "completed_steps": 0,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("learning_plans").insert(plan_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to create learning plan")
        
        plan_id = result.data[0]["id"]
        
        # Create learning steps
        for step in learning_steps:
            step_data = {
                "plan_id": plan_id,
                "step_number": step["step_number"],
                "step_title": step["title"],
                "video_id": step.get("video", {}).get("id"),
                "video_url": step.get("video", {}).get("url"),
                "video_title": step.get("video", {}).get("title"),
                "video_thumbnail": step.get("video", {}).get("thumbnail"),
                "video_duration": step.get("video", {}).get("duration"),
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("learning_steps").insert(step_data).execute()
        
        return {
            "plan_id": plan_id,
            "topic": topic,
            "total_steps": len(learning_steps),
            "status": "created"
        }
        
    except Exception as e:
        raise SupabaseError(f"Failed to create learning plan: {str(e)}")


async def get_learning_plan(plan_id: str) -> Optional[Dict]:
    """Get a learning plan with all its steps."""
    try:
        supabase = get_supabase_client()
        
        # Get plan
        plan_result = supabase.table("learning_plans").select("*").eq("id", plan_id).execute()
        
        if not plan_result.data:
            return None
        
        plan = plan_result.data[0]
        
        # Get steps
        steps_result = supabase.table("learning_steps").select("*").eq("plan_id", plan_id).order("step_number").execute()
        
        plan["steps"] = steps_result.data or []
        
        return plan
        
    except Exception as e:
        raise SupabaseError(f"Failed to get learning plan: {str(e)}")


async def get_user_plans(user_id: str) -> List[Dict]:
    """Get all learning plans for a user."""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("learning_plans").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        return result.data or []
        
    except Exception as e:
        raise SupabaseError(f"Failed to get user plans: {str(e)}")


# ============================================
# Step Completion Operations
# ============================================
async def complete_step(plan_id: str, step_number: int, user_id: str) -> Dict:
    """
    Mark a learning step as completed.
    Returns updated progress info.
    """
    try:
        supabase = get_supabase_client()
        
        # Update step status
        step_result = supabase.table("learning_steps").update({
            "status": "watched",
            "completed_at": datetime.utcnow().isoformat()
        }).eq("plan_id", plan_id).eq("step_number", step_number).execute()
        
        if not step_result.data:
            raise SupabaseError("Step not found")
        
        # Count completed steps
        all_steps = supabase.table("learning_steps").select("status").eq("plan_id", plan_id).execute()
        completed_count = sum(1 for s in all_steps.data if s["status"] == "watched")
        total_steps = len(all_steps.data)
        
        # Update plan progress
        plan_update = {
            "completed_steps": completed_count,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Check if all steps completed
        if completed_count >= total_steps:
            plan_update["status"] = "completed"
        
        supabase.table("learning_plans").update(plan_update).eq("id", plan_id).execute()
        
        # Get plan for depth info
        plan = supabase.table("learning_plans").select("*").eq("id", plan_id).single().execute()
        
        return {
            "success": True,
            "step_number": step_number,
            "completed_steps": completed_count,
            "total_steps": total_steps,
            "all_completed": completed_count >= total_steps,
            "can_go_deeper": plan.data.get("depth_level", 1) < 3 if plan.data else False,
            "current_depth": plan.data.get("depth_level", 1) if plan.data else 1,
            "topic": plan.data.get("topic") if plan.data else None
        }
        
    except Exception as e:
        raise SupabaseError(f"Failed to complete step: {str(e)}")


async def get_step_progress(plan_id: str) -> Dict:
    """Get progress for a learning plan."""
    try:
        supabase = get_supabase_client()
        
        steps = supabase.table("learning_steps").select("*").eq("plan_id", plan_id).order("step_number").execute()
        
        if not steps.data:
            return {"error": "Plan not found"}
        
        completed = [s for s in steps.data if s["status"] == "watched"]
        pending = [s for s in steps.data if s["status"] == "pending"]
        
        return {
            "total_steps": len(steps.data),
            "completed_steps": len(completed),
            "pending_steps": len(pending),
            "progress_percent": round(len(completed) / len(steps.data) * 100, 1) if steps.data else 0,
            "steps": steps.data
        }
        
    except Exception as e:
        raise SupabaseError(f"Failed to get progress: {str(e)}")


# ============================================
# Progress State Operations
# ============================================
async def save_progress_state(
    user_id: str,
    plan_id: str,
    current_step: int,
    depth_level: int
) -> Dict:
    """Save or update user's progress state."""
    try:
        supabase = get_supabase_client()
        
        state_data = {
            "user_id": user_id,
            "plan_id": plan_id,
            "current_step": current_step,
            "depth_level": depth_level,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert - insert or update
        result = supabase.table("progress_state").upsert(
            state_data,
            on_conflict="user_id,plan_id"
        ).execute()
        
        return {"success": True, "state": result.data[0] if result.data else state_data}
        
    except Exception as e:
        raise SupabaseError(f"Failed to save progress state: {str(e)}")


async def get_progress_state(user_id: str, plan_id: str) -> Optional[Dict]:
    """Get user's current progress state for a plan."""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("progress_state").select("*").eq("user_id", user_id).eq("plan_id", plan_id).execute()
        
        return result.data[0] if result.data else None
        
    except Exception as e:
        raise SupabaseError(f"Failed to get progress state: {str(e)}")


# ============================================
# Deeper Roadmap Operations
# ============================================
async def get_completed_step_titles(plan_id: str) -> List[str]:
    """Get titles of all completed steps for a plan."""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("learning_steps").select("step_title").eq("plan_id", plan_id).eq("status", "watched").execute()
        
        return [s["step_title"] for s in result.data] if result.data else []
        
    except Exception as e:
        raise SupabaseError(f"Failed to get completed steps: {str(e)}")


async def get_all_completed_steps_for_topic(user_id: str, topic: str) -> List[str]:
    """Get all completed step titles across all depth levels for a topic."""
    try:
        supabase = get_supabase_client()
        
        # Get all plans for this topic
        plans = supabase.table("learning_plans").select("id").eq("user_id", user_id).eq("topic", topic).execute()
        
        if not plans.data:
            return []
        
        plan_ids = [p["id"] for p in plans.data]
        
        # Get all completed steps
        all_completed = []
        for plan_id in plan_ids:
            steps = await get_completed_step_titles(plan_id)
            all_completed.extend(steps)
        
        return list(set(all_completed))  # Remove duplicates
        
    except Exception as e:
        raise SupabaseError(f"Failed to get completed steps: {str(e)}")
