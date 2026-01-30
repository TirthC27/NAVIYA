"""
LearnTube AI - Metrics Routes
FastAPI endpoints for observability and metrics dashboard
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timedelta

from app.db.queries_v2 import (
    get_observability_summary,
    save_eval_run,
    SupabaseError
)
from app.db.supabase_client import get_supabase_client


router = APIRouter(prefix="/metrics", tags=["Metrics & Observability"])


# ============================================
# ENDPOINTS
# ============================================

@router.get("/summary")
async def get_metrics_summary():
    """
    GET /metrics/summary
    
    Get observability metrics summary for the dashboard.
    
    Returns:
        - Evaluation metrics (avg relevance, video quality, simplicity, progressiveness)
        - Feedback metrics (thumbs up/down, approval rate)
        - Plan metrics (total plans, completion rate)
    """
    try:
        summary = await get_observability_summary()
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "data": summary
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # Return empty metrics on error (non-blocking)
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "data": {
                "eval_metrics": {},
                "feedback_metrics": {},
                "plan_metrics": {}
            }
        }


@router.get("/evals")
async def get_eval_runs(
    plan_id: Optional[str] = None,
    limit: int = 50
):
    """
    GET /metrics/evals
    
    Get evaluation run history.
    Optionally filter by plan_id.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("eval_runs").select("*")
        
        if plan_id:
            query = query.eq("plan_id", plan_id)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "total": len(result.data or []),
            "evals": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get eval runs: {str(e)}")


@router.get("/feedback")
async def get_all_feedback(limit: int = 100):
    """
    GET /metrics/feedback
    
    Get recent feedback entries.
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("feedback").select(
            "*, videos(title, video_id)"
        ).order("created_at", desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "total": len(result.data or []),
            "feedback": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")


@router.get("/dashboard")
async def get_full_dashboard():
    """
    GET /metrics/dashboard
    
    Get comprehensive dashboard data including:
    - Summary metrics
    - Recent evaluations
    - Recent feedback
    - Trending topics
    """
    try:
        supabase = get_supabase_client()
        
        # Get summary
        summary = await get_observability_summary()
        
        # Get recent evals
        evals_result = supabase.table("eval_runs").select("*").order("created_at", desc=True).limit(10).execute()
        
        # Get recent feedback
        feedback_result = supabase.table("feedback").select(
            "id, rating, created_at, videos(title)"
        ).order("created_at", desc=True).limit(10).execute()
        
        # Get trending topics (most recent plans)
        topics_result = supabase.table("learning_plans").select(
            "topic, learning_mode, created_at"
        ).order("created_at", desc=True).limit(10).execute()
        
        # Calculate daily stats
        today = datetime.utcnow().date()
        plans_today = supabase.table("learning_plans").select("id").gte(
            "created_at", today.isoformat()
        ).execute()
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "summary": summary,
            "recent_evals": evals_result.data or [],
            "recent_feedback": feedback_result.data or [],
            "trending_topics": [t["topic"] for t in (topics_result.data or [])],
            "daily_stats": {
                "plans_created_today": len(plans_today.data or []),
                "date": today.isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.get("/prompts")
async def get_prompt_versions(prompt_name: Optional[str] = None):
    """
    GET /metrics/prompts
    
    Get prompt version history for OPIK experiments.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("prompt_versions").select("*")
        
        if prompt_name:
            query = query.eq("prompt_name", prompt_name)
        
        result = query.order("created_at", desc=True).execute()
        
        return {
            "success": True,
            "prompts": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompts: {str(e)}")


@router.get("/health")
async def metrics_health():
    """
    GET /metrics/health
    
    Health check for metrics/database connectivity.
    """
    try:
        supabase = get_supabase_client()
        
        # Simple query to check connection
        result = supabase.table("users").select("id").limit(1).execute()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
