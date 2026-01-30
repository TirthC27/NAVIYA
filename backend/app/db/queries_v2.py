"""
LearnTube AI - Database Query Layer
Complete CRUD operations for Progressive Learning System
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import json

from app.db.supabase_client import get_supabase_client, SupabaseError, ANONYMOUS_USER_ID


# ============================================
# USER OPERATIONS
# ============================================

async def get_or_create_user(
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    display_name: Optional[str] = None
) -> Dict:
    """
    Get existing user or create new one.
    Returns anonymous user if no ID provided.
    """
    try:
        supabase = get_supabase_client()
        
        # Use anonymous user if no ID
        if not user_id:
            user_id = ANONYMOUS_USER_ID
        
        # Try to get existing user
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if result.data:
            return result.data[0]
        
        # Create new user
        user_data = {
            "id": user_id,
            "email": email,
            "display_name": display_name or "User"
        }
        
        result = supabase.table("users").insert(user_data).execute()
        return result.data[0] if result.data else {"id": user_id}
        
    except Exception as e:
        # Return anonymous user on error
        return {"id": ANONYMOUS_USER_ID, "display_name": "Anonymous"}


# ============================================
# LEARNING PLAN OPERATIONS
# ============================================

async def create_learning_plan(
    user_id: Optional[str],
    topic: str,
    learning_mode: str = "standard",
    difficulty: str = "medium",
    estimated_time: str = None
) -> Dict:
    """
    Create a new learning plan for a user.
    
    Args:
        user_id: User's UUID (uses anonymous if None)
        topic: Learning topic
        learning_mode: quick, standard, or comprehensive
        difficulty: simple, medium, or hard
        estimated_time: Estimated completion time
        
    Returns:
        Created learning plan with ID
    """
    try:
        supabase = get_supabase_client()
        
        # Ensure user exists
        await get_or_create_user(user_id)
        
        plan_data = {
            "user_id": user_id or ANONYMOUS_USER_ID,
            "topic": topic,
            "learning_mode": learning_mode,
            "difficulty": difficulty,
            "estimated_time": estimated_time,
            "current_depth_level": 1,
            "is_completed": False
        }
        
        result = supabase.table("learning_plans").insert(plan_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to create learning plan", "create_learning_plan")
        
        return result.data[0]
        
    except Exception as e:
        raise SupabaseError(f"Failed to create learning plan: {str(e)}", "create_learning_plan")


async def add_roadmap_steps(
    plan_id: str,
    depth_level: int,
    steps_list: List[Dict]
) -> List[Dict]:
    """
    Add roadmap steps to a learning plan.
    
    Args:
        plan_id: Learning plan UUID
        depth_level: Current depth level (1, 2, 3)
        steps_list: List of step dictionaries with title, description, search_query
        
    Returns:
        List of created step records
    """
    try:
        supabase = get_supabase_client()
        
        created_steps = []
        
        for idx, step in enumerate(steps_list, start=1):
            step_data = {
                "plan_id": plan_id,
                "depth_level": depth_level,
                "step_number": idx,
                "title": step.get("title", f"Step {idx}"),
                "description": step.get("description", ""),
                "search_query": step.get("query", step.get("search_query", "")),
                "is_unlocked": idx == 1  # First step is unlocked
            }
            
            result = supabase.table("roadmap_steps").insert(step_data).execute()
            
            if result.data:
                created_steps.append(result.data[0])
        
        # Update plan's current depth level
        supabase.table("learning_plans").update({
            "current_depth_level": depth_level
        }).eq("id", plan_id).execute()
        
        return created_steps
        
    except Exception as e:
        raise SupabaseError(f"Failed to add roadmap steps: {str(e)}", "add_roadmap_steps")


async def attach_video_to_step(
    step_id: str,
    video_metadata: Dict
) -> Dict:
    """
    Attach a video to a roadmap step (1:1 relationship).
    
    Args:
        step_id: Roadmap step UUID
        video_metadata: Video info from YouTube API
        
    Returns:
        Created video record
    """
    try:
        supabase = get_supabase_client()
        
        video_data = {
            "step_id": step_id,
            "video_id": video_metadata.get("video_id", ""),
            "title": video_metadata.get("title", "Untitled Video"),
            "channel_title": video_metadata.get("channel_title", ""),
            "duration_seconds": video_metadata.get("duration_seconds"),
            "duration_formatted": video_metadata.get("duration_formatted", ""),
            "view_count": video_metadata.get("view_count"),
            "thumbnail_url": video_metadata.get("thumbnail_url", ""),
            "url": video_metadata.get("url", f"https://youtube.com/watch?v={video_metadata.get('video_id', '')}"),
            "has_captions": video_metadata.get("has_captions", False),
            "relevance_score": video_metadata.get("relevance_score"),
            "fetch_latency_ms": video_metadata.get("fetch_latency_ms")
        }
        
        result = supabase.table("videos").insert(video_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to attach video", "attach_video_to_step")
        
        return result.data[0]
        
    except Exception as e:
        # Check if it's a unique constraint violation (video already exists)
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            # Update existing video instead
            result = supabase.table("videos").update(video_data).eq("step_id", step_id).execute()
            if result.data:
                return result.data[0]
        
        raise SupabaseError(f"Failed to attach video: {str(e)}", "attach_video_to_step")


async def mark_step_completed(
    user_id: Optional[str],
    step_id: str,
    watch_time_seconds: int = 0
) -> Dict:
    """
    Mark a roadmap step as completed/watched.
    
    Args:
        user_id: User's UUID
        step_id: Roadmap step UUID
        watch_time_seconds: Time spent watching
        
    Returns:
        Updated progress record
    """
    try:
        supabase = get_supabase_client()
        
        user_id = user_id or ANONYMOUS_USER_ID
        
        # Check if progress record exists
        existing = supabase.table("progress").select("*").eq("user_id", user_id).eq("step_id", step_id).execute()
        
        progress_data = {
            "user_id": user_id,
            "step_id": step_id,
            "status": "watched",
            "completed_at": datetime.utcnow().isoformat(),
            "watch_time_seconds": watch_time_seconds
        }
        
        if existing.data:
            # Update existing record
            result = supabase.table("progress").update(progress_data).eq("id", existing.data[0]["id"]).execute()
        else:
            # Create new record
            progress_data["started_at"] = datetime.utcnow().isoformat()
            result = supabase.table("progress").insert(progress_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to update progress", "mark_step_completed")
        
        # Unlock next step
        await _unlock_next_step(step_id)
        
        return result.data[0]
        
    except Exception as e:
        raise SupabaseError(f"Failed to mark step completed: {str(e)}", "mark_step_completed")


async def _unlock_next_step(completed_step_id: str):
    """Unlock the next step after completing current one."""
    try:
        supabase = get_supabase_client()
        
        # Get current step info
        step = supabase.table("roadmap_steps").select("*").eq("id", completed_step_id).execute()
        
        if not step.data:
            return
        
        current = step.data[0]
        
        # Find and unlock next step
        next_step = supabase.table("roadmap_steps").select("id").eq("plan_id", current["plan_id"]).eq("depth_level", current["depth_level"]).eq("step_number", current["step_number"] + 1).execute()
        
        if next_step.data:
            supabase.table("roadmap_steps").update({"is_unlocked": True}).eq("id", next_step.data[0]["id"]).execute()
            
    except Exception:
        pass  # Non-critical operation


async def get_learning_plan(plan_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
    """
    Get full learning plan with steps, videos, and progress.
    
    Args:
        plan_id: Learning plan UUID
        user_id: User UUID for progress info
        
    Returns:
        Complete learning plan with nested steps and videos
    """
    try:
        supabase = get_supabase_client()
        user_id = user_id or ANONYMOUS_USER_ID
        
        # Get plan
        plan_result = supabase.table("learning_plans").select("*").eq("id", plan_id).execute()
        
        if not plan_result.data:
            return None
        
        plan = plan_result.data[0]
        
        # Get steps with videos
        steps_result = supabase.table("roadmap_steps").select("*, videos(*)").eq("plan_id", plan_id).order("depth_level").order("step_number").execute()
        
        # Get user progress for these steps
        step_ids = [s["id"] for s in (steps_result.data or [])]
        
        progress_map = {}
        if step_ids:
            progress_result = supabase.table("progress").select("*").eq("user_id", user_id).in_("step_id", step_ids).execute()
            progress_map = {p["step_id"]: p for p in (progress_result.data or [])}
        
        # Build response
        steps = []
        for step in (steps_result.data or []):
            video_data = step.get("videos", [])
            video = video_data[0] if video_data else None
            progress = progress_map.get(step["id"], {})
            
            steps.append({
                "step_id": step["id"],
                "step_number": step["step_number"],
                "depth_level": step["depth_level"],
                "title": step["title"],
                "description": step.get("description"),
                "is_unlocked": step["is_unlocked"],
                "video": {
                    "id": video["id"],
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "channel": video["channel_title"],
                    "duration": video["duration_formatted"],
                    "views": video["view_count"],
                    "thumbnail": video["thumbnail_url"],
                    "url": video["url"],
                    "has_captions": video.get("has_captions", False)
                } if video else None,
                "status": progress.get("status", "pending"),
                "completed_at": progress.get("completed_at")
            })
        
        return {
            "plan_id": plan["id"],
            "user_id": plan["user_id"],
            "topic": plan["topic"],
            "learning_mode": plan["learning_mode"],
            "difficulty": plan["difficulty"],
            "depth_level": plan["current_depth_level"],
            "estimated_time": plan.get("estimated_time"),
            "is_completed": plan["is_completed"],
            "created_at": plan["created_at"],
            "steps": steps
        }
        
    except Exception as e:
        raise SupabaseError(f"Failed to get learning plan: {str(e)}", "get_learning_plan")


async def get_user_plans(user_id: Optional[str], limit: int = 10) -> List[Dict]:
    """Get all learning plans for a user."""
    try:
        supabase = get_supabase_client()
        user_id = user_id or ANONYMOUS_USER_ID
        
        result = supabase.table("learning_plans").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        return result.data or []
        
    except Exception as e:
        raise SupabaseError(f"Failed to get user plans: {str(e)}", "get_user_plans")


# ============================================
# FEEDBACK OPERATIONS
# ============================================

async def submit_feedback(
    user_id: Optional[str],
    video_id: str,
    rating: str,
    comment: Optional[str] = None
) -> Dict:
    """
    Submit feedback (thumbs up/down) for a video.
    
    Args:
        user_id: User UUID
        video_id: Video UUID (from videos table)
        rating: 'up' or 'down'
        comment: Optional comment
        
    Returns:
        Created feedback record
    """
    try:
        supabase = get_supabase_client()
        
        if rating not in ["up", "down"]:
            raise ValueError("Rating must be 'up' or 'down'")
        
        feedback_data = {
            "user_id": user_id or ANONYMOUS_USER_ID,
            "video_id": video_id,
            "rating": rating,
            "comment": comment
        }
        
        result = supabase.table("feedback").insert(feedback_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to submit feedback", "submit_feedback")
        
        return result.data[0]
        
    except Exception as e:
        raise SupabaseError(f"Failed to submit feedback: {str(e)}", "submit_feedback")


async def get_video_feedback(video_id: str) -> Dict:
    """Get aggregated feedback for a video."""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("feedback").select("rating").eq("video_id", video_id).execute()
        
        feedback_list = result.data or []
        
        ups = sum(1 for f in feedback_list if f["rating"] == "up")
        downs = sum(1 for f in feedback_list if f["rating"] == "down")
        
        return {
            "video_id": video_id,
            "thumbs_up": ups,
            "thumbs_down": downs,
            "total": len(feedback_list),
            "approval_rate": (ups / len(feedback_list) * 100) if feedback_list else 0
        }
        
    except Exception as e:
        raise SupabaseError(f"Failed to get video feedback: {str(e)}", "get_video_feedback")


# ============================================
# EVALUATION OPERATIONS
# ============================================

async def save_eval_run(
    plan_id: str,
    depth_level: int,
    scores: Dict,
    trace_id: Optional[str] = None,
    evaluator_model: str = "gemini-pro"
) -> Dict:
    """
    Save LLM-as-Judge evaluation scores.
    
    Args:
        plan_id: Learning plan UUID
        depth_level: Depth level being evaluated
        scores: Dict with relevance, video_quality, simplicity, progressiveness, overall
        trace_id: OPIK trace ID
        evaluator_model: Model used for evaluation
        
    Returns:
        Created eval run record
    """
    try:
        supabase = get_supabase_client()
        
        eval_data = {
            "plan_id": plan_id,
            "depth_level": depth_level,
            "trace_id": trace_id,
            "relevance_score": scores.get("relevance", scores.get("relevance_score")),
            "video_quality_score": scores.get("video_quality", scores.get("video_quality_score")),
            "simplicity_score": scores.get("simplicity", scores.get("simplicity_score")),
            "progressiveness_score": scores.get("progressiveness", scores.get("progressiveness_score")),
            "overall_score": scores.get("overall", scores.get("overall_score")),
            "evaluator_model": evaluator_model,
            "evaluation_latency_ms": scores.get("latency_ms"),
            "raw_feedback": scores.get("raw_feedback") or scores
        }
        
        result = supabase.table("eval_runs").insert(eval_data).execute()
        
        if not result.data:
            raise SupabaseError("Failed to save eval run", "save_eval_run")
        
        return result.data[0]
        
    except Exception as e:
        raise SupabaseError(f"Failed to save eval run: {str(e)}", "save_eval_run")


async def get_observability_summary() -> Dict:
    """
    Get observability metrics summary for dashboard.
    
    Returns:
        Dict with avg relevance, video quality, simplicity, etc.
    """
    try:
        supabase = get_supabase_client()
        
        # Get eval metrics
        eval_result = supabase.table("eval_runs").select("*").execute()
        evals = eval_result.data or []
        
        # Get feedback metrics
        feedback_result = supabase.table("feedback").select("rating").execute()
        feedback_list = feedback_result.data or []
        
        # Get plan counts
        plans_result = supabase.table("learning_plans").select("id, is_completed").execute()
        plans = plans_result.data or []
        
        # Calculate averages
        def safe_avg(values):
            valid = [v for v in values if v is not None]
            return round(sum(valid) / len(valid), 2) if valid else 0
        
        # Feedback stats
        ups = sum(1 for f in feedback_list if f["rating"] == "up")
        downs = sum(1 for f in feedback_list if f["rating"] == "down")
        
        return {
            "eval_metrics": {
                "total_eval_runs": len(evals),
                "avg_relevance": safe_avg([e.get("relevance_score") for e in evals]),
                "avg_video_quality": safe_avg([e.get("video_quality_score") for e in evals]),
                "avg_simplicity": safe_avg([e.get("simplicity_score") for e in evals]),
                "avg_progressiveness": safe_avg([e.get("progressiveness_score") for e in evals]),
                "avg_overall": safe_avg([e.get("overall_score") for e in evals])
            },
            "feedback_metrics": {
                "total_feedback": len(feedback_list),
                "thumbs_up": ups,
                "thumbs_down": downs,
                "approval_rate": round((ups / len(feedback_list) * 100), 2) if feedback_list else 0
            },
            "plan_metrics": {
                "total_plans": len(plans),
                "completed_plans": sum(1 for p in plans if p.get("is_completed")),
                "completion_rate": round(
                    (sum(1 for p in plans if p.get("is_completed")) / len(plans) * 100), 2
                ) if plans else 0
            }
        }
        
    except Exception as e:
        # Return empty metrics on error
        return {
            "eval_metrics": {
                "total_eval_runs": 0,
                "avg_relevance": 0,
                "avg_video_quality": 0,
                "avg_simplicity": 0,
                "avg_progressiveness": 0,
                "avg_overall": 0
            },
            "feedback_metrics": {
                "total_feedback": 0,
                "thumbs_up": 0,
                "thumbs_down": 0,
                "approval_rate": 0
            },
            "plan_metrics": {
                "total_plans": 0,
                "completed_plans": 0,
                "completion_rate": 0
            },
            "error": str(e)
        }


# ============================================
# PROMPT VERSION OPERATIONS
# ============================================

async def save_prompt_version(
    prompt_name: str,
    content: str,
    variables: Optional[Dict] = None,
    is_active: bool = False
) -> Dict:
    """Save a new prompt version for OPIK experiments."""
    try:
        supabase = get_supabase_client()
        
        # Get next version number
        existing = supabase.table("prompt_versions").select("version").eq("prompt_name", prompt_name).order("version", desc=True).limit(1).execute()
        
        next_version = 1
        if existing.data:
            next_version = existing.data[0]["version"] + 1
        
        # If setting as active, deactivate others
        if is_active:
            supabase.table("prompt_versions").update({"is_active": False}).eq("prompt_name", prompt_name).execute()
        
        prompt_data = {
            "prompt_name": prompt_name,
            "version": next_version,
            "content": content,
            "variables": variables,
            "is_active": is_active
        }
        
        result = supabase.table("prompt_versions").insert(prompt_data).execute()
        
        return result.data[0] if result.data else {}
        
    except Exception as e:
        raise SupabaseError(f"Failed to save prompt version: {str(e)}", "save_prompt_version")


async def get_active_prompt(prompt_name: str) -> Optional[Dict]:
    """Get the active version of a prompt."""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("prompt_versions").select("*").eq("prompt_name", prompt_name).eq("is_active", True).execute()
        
        return result.data[0] if result.data else None
        
    except Exception as e:
        return None


# ============================================
# HELPER FUNCTIONS
# ============================================

async def save_full_learning_plan(
    user_id: Optional[str],
    topic: str,
    learning_mode: str,
    difficulty: str,
    depth_level: int,
    steps: List[Dict],
    eval_scores: Optional[Dict] = None,
    trace_id: Optional[str] = None
) -> Dict:
    """
    Helper to save a complete learning plan with steps, videos, and eval scores.
    Used by the main generate_learning_plan function.
    """
    try:
        # Create plan
        plan = await create_learning_plan(
            user_id=user_id,
            topic=topic,
            learning_mode=learning_mode,
            difficulty=difficulty
        )
        
        plan_id = plan["id"]
        
        # Add steps
        step_data = []
        for step in steps:
            step_data.append({
                "title": step.get("title", ""),
                "description": step.get("description", ""),
                "query": step.get("query", step.get("search_query", ""))
            })
        
        created_steps = await add_roadmap_steps(plan_id, depth_level, step_data)
        
        # Attach videos
        for i, step in enumerate(steps):
            if i < len(created_steps) and step.get("video"):
                await attach_video_to_step(
                    step_id=created_steps[i]["id"],
                    video_metadata=step["video"]
                )
        
        # Save eval scores if provided
        if eval_scores:
            await save_eval_run(
                plan_id=plan_id,
                depth_level=depth_level,
                scores=eval_scores,
                trace_id=trace_id
            )
        
        # Return full plan
        return await get_learning_plan(plan_id, user_id)
        
    except Exception as e:
        raise SupabaseError(f"Failed to save full learning plan: {str(e)}", "save_full_learning_plan")
