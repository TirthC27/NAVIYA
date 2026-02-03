"""
Dashboard State API Routes

Single source of truth for UI rendering.
UI ONLY reads from this endpoint.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx

from app.config import settings
from app.services.dashboard_state import get_dashboard_state_service


router = APIRouter(prefix="/dashboard-state", tags=["dashboard-state"])


# ============================================
# Response Models
# ============================================

class DashboardStateResponse(BaseModel):
    """Dashboard state response"""
    user_id: str
    current_phase: str
    resume_ready: bool
    roadmap_ready: bool
    skill_eval_ready: bool
    interview_ready: bool
    mentor_ready: bool
    domain: Optional[str]
    last_updated_by_agent: Optional[str]
    updated_at: Optional[str]
    features_unlocked: int


# ============================================
# Helper Functions
# ============================================

def get_supabase_headers():
    """Get headers for Supabase REST API"""
    return {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json"
    }


# ============================================
# API Endpoints
# ============================================

@router.get("/{user_id}")
async def get_dashboard_state(user_id: str):
    """
    Get current dashboard state for a user.
    
    This is the ONLY endpoint the frontend should use to determine
    what cards/features to render.
    
    Returns:
        Dashboard state with all feature flags
    """
    try:
        service = get_dashboard_state_service()
        state = await service.get_state(user_id)
        
        if not state:
            # Return default state if not initialized
            return {
                "success": True,
                "state": {
                    "user_id": user_id,
                    "current_phase": "onboarding",
                    "resume_ready": False,
                    "roadmap_ready": False,
                    "skill_eval_ready": False,
                    "interview_ready": False,
                    "mentor_ready": True,
                    "domain": None,
                    "last_updated_by_agent": None,
                    "updated_at": None,
                    "features_unlocked": 0
                }
            }
        
        # Calculate features unlocked
        features_unlocked = sum([
            state.get("resume_ready", False),
            state.get("roadmap_ready", False),
            state.get("skill_eval_ready", False),
            state.get("interview_ready", False)
        ])
        
        return {
            "success": True,
            "state": {
                **state,
                "features_unlocked": features_unlocked
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/initialize")
async def initialize_dashboard_state(
    user_id: str, 
    domain: Optional[str] = Query(None, pattern="^(tech|medical)$")
):
    """
    Initialize dashboard state for a new user.
    Called during onboarding.
    
    Returns:
        Initialized state
    """
    try:
        service = get_dashboard_state_service()
        result = await service.initialize_state(user_id, domain)
        
        return {
            "success": True,
            "state": result.get("state", result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/features")
async def get_unlocked_features(user_id: str):
    """
    Get list of unlocked features for a user.
    
    Returns:
        List of feature names that are ready
    """
    try:
        service = get_dashboard_state_service()
        state = await service.get_state(user_id)
        
        features = []
        
        if state:
            if state.get("mentor_ready", True):
                features.append("mentor")
            if state.get("resume_ready"):
                features.append("resume_analysis")
            if state.get("roadmap_ready"):
                features.append("roadmap")
            if state.get("skill_eval_ready"):
                features.append("skill_assessment")
            if state.get("interview_ready"):
                features.append("mock_interview")
        else:
            # Mentor is always available
            features.append("mentor")
        
        return {
            "success": True,
            "user_id": user_id,
            "features": features,
            "current_phase": state.get("current_phase", "onboarding") if state else "onboarding"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/can-access/{feature}")
async def can_access_feature(user_id: str, feature: str):
    """
    Check if user can access a specific feature.
    
    Features:
    - mentor (always available)
    - resume_analysis (requires resume_ready)
    - roadmap (requires roadmap_ready)
    - skill_assessment (requires skill_eval_ready)
    - mock_interview (requires interview_ready)
    
    Returns:
        Whether user can access the feature
    """
    try:
        service = get_dashboard_state_service()
        state = await service.get_state(user_id)
        
        feature_map = {
            "mentor": "mentor_ready",
            "resume_analysis": "resume_ready",
            "roadmap": "roadmap_ready",
            "skill_assessment": "skill_eval_ready",
            "mock_interview": "interview_ready"
        }
        
        if feature not in feature_map:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown feature: {feature}. Valid: {list(feature_map.keys())}"
            )
        
        # Mentor is always available
        if feature == "mentor":
            return {
                "success": True,
                "feature": feature,
                "can_access": True,
                "reason": "Mentor is always available"
            }
        
        if not state:
            return {
                "success": True,
                "feature": feature,
                "can_access": False,
                "reason": "Dashboard state not initialized"
            }
        
        can_access = state.get(feature_map[feature], False)
        
        if can_access:
            reason = f"{feature} is unlocked"
        else:
            # Provide helpful message
            reasons = {
                "resume_analysis": "Upload and analyze your resume first",
                "roadmap": "Complete onboarding to generate your roadmap",
                "skill_assessment": "Complete at least one skill assessment",
                "mock_interview": "Complete skill assessments to unlock mock interviews"
            }
            reason = reasons.get(feature, f"{feature} is not yet unlocked")
        
        return {
            "success": True,
            "feature": feature,
            "can_access": can_access,
            "reason": reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Agent Activity Feed
# ============================================

@router.get("/agent-activity/{user_id}")
async def get_agent_activity(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Get agent activity feed for a user.
    Reads from agent_activity_log table.
    """
    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/agent_activity_log"
        params = {
            "user_id": f"eq.{user_id}",
            "select": "id,agent_name,action_type,summary,details,created_at",
            "order": "created_at.desc",
            "limit": str(limit)
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params=params,
                timeout=10.0
            )
            
            if response.status_code == 200:
                activities = response.json()
                return {
                    "success": True,
                    "activities": activities,
                    "count": len(activities)
                }
            else:
                # Table might not exist yet, return empty
                return {
                    "success": True,
                    "activities": [],
                    "count": 0,
                    "message": "No activity log found"
                }
                
    except Exception as e:
        # Return empty instead of error (table might not exist)
        return {
            "success": True,
            "activities": [],
            "count": 0,
            "message": str(e)
        }
