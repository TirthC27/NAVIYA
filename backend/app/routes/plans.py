"""
LearnTube AI - Plans Routes
FastAPI endpoints for learning plan management
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.queries_v2 import (
    create_learning_plan,
    add_roadmap_steps,
    attach_video_to_step,
    mark_step_completed,
    get_learning_plan,
    get_user_plans,
    submit_feedback,
    get_video_feedback,
    save_full_learning_plan,
    SupabaseError
)
from app.db.supabase_client import ANONYMOUS_USER_ID


router = APIRouter(prefix="/plans", tags=["Learning Plans"])


# ============================================
# Request/Response Models
# ============================================

class CreatePlanRequest(BaseModel):
    """Request to create a new learning plan"""
    user_id: Optional[str] = None
    topic: str
    learning_mode: str = "standard"  # quick, standard, comprehensive
    difficulty: str = "medium"
    estimated_time: Optional[str] = None


class CreatePlanResponse(BaseModel):
    """Response after creating a plan"""
    success: bool
    plan_id: str
    topic: str
    learning_mode: str
    message: str


class AddStepsRequest(BaseModel):
    """Request to add roadmap steps to a plan"""
    depth_level: int = 1
    steps: List[dict]  # [{title, description, query}, ...]


class VideoMetadata(BaseModel):
    """Video metadata for attaching to a step"""
    video_id: str
    title: str
    channel_title: Optional[str] = None
    duration_seconds: Optional[int] = None
    duration_formatted: Optional[str] = None
    view_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    url: str
    has_captions: bool = False
    relevance_score: Optional[float] = None


class AttachVideoRequest(BaseModel):
    """Request to attach a video to a step"""
    video: VideoMetadata


class CompleteStepRequest(BaseModel):
    """Request to mark a step as completed"""
    user_id: Optional[str] = None
    watch_time_seconds: int = 0


class FeedbackRequest(BaseModel):
    """Request to submit video feedback"""
    user_id: Optional[str] = None
    rating: str  # 'up' or 'down'
    comment: Optional[str] = None


class StepResponse(BaseModel):
    """Single step in a learning plan response"""
    step_id: str
    step_number: int
    title: str
    video: Optional[dict] = None
    status: str = "pending"


class PlanResponse(BaseModel):
    """Full learning plan response for frontend"""
    plan_id: str
    topic: str
    depth_level: int
    learning_mode: str
    difficulty: str
    estimated_time: Optional[str]
    is_completed: bool
    steps: List[dict]


# ============================================
# ENDPOINTS
# ============================================

@router.post("/create", response_model=dict)
async def create_plan_endpoint(request: CreatePlanRequest):
    """
    POST /plans/create
    
    Create a new learning plan for a topic.
    """
    try:
        plan = await create_learning_plan(
            user_id=request.user_id,
            topic=request.topic,
            learning_mode=request.learning_mode,
            difficulty=request.difficulty,
            estimated_time=request.estimated_time
        )
        
        return {
            "success": True,
            "plan_id": plan["id"],
            "topic": plan["topic"],
            "learning_mode": plan["learning_mode"],
            "message": f"Learning plan created for '{request.topic}'"
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create plan: {str(e)}")


@router.post("/{plan_id}/steps/add", response_model=dict)
async def add_steps_endpoint(plan_id: str, request: AddStepsRequest):
    """
    POST /plans/{plan_id}/steps/add
    
    Add roadmap steps to an existing learning plan.
    """
    try:
        created_steps = await add_roadmap_steps(
            plan_id=plan_id,
            depth_level=request.depth_level,
            steps_list=request.steps
        )
        
        return {
            "success": True,
            "plan_id": plan_id,
            "steps_added": len(created_steps),
            "depth_level": request.depth_level,
            "steps": created_steps
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add steps: {str(e)}")


@router.post("/steps/{step_id}/video", response_model=dict)
async def attach_video_endpoint(step_id: str, request: AttachVideoRequest):
    """
    POST /plans/steps/{step_id}/video
    
    Attach a video to a roadmap step.
    """
    try:
        video = await attach_video_to_step(
            step_id=step_id,
            video_metadata=request.video.model_dump()
        )
        
        return {
            "success": True,
            "step_id": step_id,
            "video_id": video["id"],
            "message": "Video attached to step"
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to attach video: {str(e)}")


@router.post("/steps/{step_id}/complete", response_model=dict)
async def complete_step_endpoint(step_id: str, request: CompleteStepRequest):
    """
    POST /steps/{step_id}/complete
    
    Mark a learning step as completed/watched.
    This unlocks the next step in the roadmap.
    """
    try:
        progress = await mark_step_completed(
            user_id=request.user_id,
            step_id=step_id,
            watch_time_seconds=request.watch_time_seconds
        )
        
        return {
            "success": True,
            "step_id": step_id,
            "status": "watched",
            "completed_at": progress.get("completed_at"),
            "message": "Step marked as completed! Next step unlocked.",
            "can_go_deeper": True  # Frontend can show "Go Deeper?" prompt
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete step: {str(e)}")


@router.get("/{plan_id}", response_model=dict)
async def get_plan_endpoint(plan_id: str, user_id: Optional[str] = None):
    """
    GET /plans/{plan_id}
    
    Get a full learning plan with steps, videos, and progress.
    
    Response format (frontend-ready):
    {
        "plan_id": "...",
        "topic": "...",
        "depth_level": 1,
        "steps": [
            {
                "step_number": 1,
                "title": "BFS Basics",
                "video": {
                    "title": "...",
                    "url": "..."
                },
                "status": "pending"
            }
        ]
    }
    """
    try:
        plan = await get_learning_plan(plan_id, user_id)
        
        if not plan:
            raise HTTPException(status_code=404, detail="Learning plan not found")
        
        # Format for frontend
        return {
            "success": True,
            "data": plan
        }
        
    except HTTPException:
        raise
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get plan: {str(e)}")


@router.get("/user/{user_id}", response_model=dict)
async def get_user_plans_endpoint(user_id: str, limit: int = 10):
    """
    GET /plans/user/{user_id}
    
    Get all learning plans for a user.
    """
    try:
        plans = await get_user_plans(user_id, limit)
        
        return {
            "success": True,
            "user_id": user_id,
            "total": len(plans),
            "plans": plans
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user plans: {str(e)}")


# ============================================
# FEEDBACK ENDPOINTS
# ============================================

@router.post("/videos/{video_id}/feedback", response_model=dict)
async def submit_feedback_endpoint(video_id: str, request: FeedbackRequest):
    """
    POST /videos/{video_id}/feedback
    
    Submit thumbs up/down feedback for a video.
    """
    try:
        if request.rating not in ["up", "down"]:
            raise HTTPException(status_code=400, detail="Rating must be 'up' or 'down'")
        
        feedback = await submit_feedback(
            user_id=request.user_id,
            video_id=video_id,
            rating=request.rating,
            comment=request.comment
        )
        
        return {
            "success": True,
            "feedback_id": feedback["id"],
            "video_id": video_id,
            "rating": request.rating,
            "message": "Thank you for your feedback!"
        }
        
    except HTTPException:
        raise
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@router.get("/videos/{video_id}/feedback", response_model=dict)
async def get_feedback_endpoint(video_id: str):
    """
    GET /videos/{video_id}/feedback
    
    Get aggregated feedback for a video.
    """
    try:
        feedback = await get_video_feedback(video_id)
        
        return {
            "success": True,
            "data": feedback
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")
