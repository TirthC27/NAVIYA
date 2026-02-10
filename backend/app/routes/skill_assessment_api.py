"""
Skill Assessment API Routes

Endpoints for:
- Generating skill assessments
- Submitting assessment responses
- Retrieving assessment results
- Checking retake availability
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import httpx

from app.config import settings
from app.agents.skill_evaluation_agent import (
    SkillEvaluationAgentWorker,
    AssessmentInput
)
from app.observability.opik_client import (
    start_trace, end_trace, log_metric, log_feedback
)


router = APIRouter(prefix="/assessments", tags=["skill-assessments"])


# ============================================
# Request/Response Models
# ============================================

class GenerateAssessmentRequest(BaseModel):
    """Request to generate a new assessment"""
    user_id: str
    domain: str = Field(..., pattern="^(tech|medical)$")
    skill_or_subject: str = Field(..., min_length=2)
    current_phase: Optional[int] = 1
    rag_context: Optional[str] = None


class SubmitResponsesRequest(BaseModel):
    """Request to submit assessment responses"""
    user_id: str
    domain: str = Field(..., pattern="^(tech|medical)$")
    skill_or_subject: str
    current_phase: Optional[int] = 1
    responses: List[Dict[str, Any]]


class AssessmentResponse(BaseModel):
    """Assessment generation response"""
    success: bool
    assessment_id: Optional[str] = None
    domain: Optional[str] = None
    skill_or_subject: Optional[str] = None
    difficulty: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    total_questions: Optional[int] = None
    error: Optional[str] = None


class EvaluationResponse(BaseModel):
    """Assessment evaluation response"""
    success: bool
    assessment_id: Optional[str] = None
    domain: Optional[str] = None
    skill_or_subject: Optional[str] = None
    raw_score: Optional[float] = None
    proficiency_level: Optional[str] = None
    confidence_level: Optional[str] = None
    weak_areas: Optional[List[str]] = None
    recommendation: Optional[str] = None
    retake_available_at: Optional[str] = None
    error: Optional[str] = None


class SkillSummaryResponse(BaseModel):
    """User skill summary response"""
    user_id: str
    domain: str
    total_assessments: int
    average_score: float
    skills: List[Dict[str, Any]]


# ============================================
# Helper Functions
# ============================================

def get_supabase_headers():
    """Get headers for Supabase REST API"""
    return {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


async def create_agent_task(task_type: str, payload: Dict[str, Any]) -> str:
    """Create an agent task in the database"""
    task_id = str(uuid.uuid4())
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        task_data = {
            "id": task_id,
            "agent_name": "SkillEvaluationAgent",
            "task_type": task_type,
            "task_payload": payload,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/agent_tasks",
            headers=get_supabase_headers(),
            json=task_data
        )
        
        if response.status_code not in [200, 201]:
            # Task logging failed but we can continue
            pass
    
    return task_id


# ============================================
# API Endpoints
# ============================================

@router.post("/generate", response_model=AssessmentResponse)
async def generate_assessment(request: GenerateAssessmentRequest):
    """
    Generate a new skill assessment.
    
    Creates assessment questions based on domain, skill, and current phase.
    
    Returns:
        Assessment questions with metadata
    """
    try:
        # Create worker instance
        worker = SkillEvaluationAgentWorker()
        
        # Create task
        task_id = await create_agent_task(
            task_type="generate_skill_assessment",
            payload={
                "user_id": request.user_id,
                "domain": request.domain,
                "skill_or_subject": request.skill_or_subject,
                "current_phase": request.current_phase,
                "rag_context": request.rag_context,
                "task_type": "generate_skill_assessment"
            }
        )
        
        # Execute
        result = await worker.execute({
            "id": task_id,
            "task_type": "generate_skill_assessment",
            "task_payload": {
                "user_id": request.user_id,
                "domain": request.domain,
                "skill_or_subject": request.skill_or_subject,
                "current_phase": request.current_phase,
                "rag_context": request.rag_context,
                "task_type": "generate_skill_assessment"
            }
        })
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to generate assessment")
            )
        
        assessment = result.get("assessment", {})
        
        log_metric(trace_id, "total_questions", float(assessment.get("total_questions", 0)))
        end_trace(
            trace_id,
            output={"questions": assessment.get("total_questions", 0), "difficulty": assessment.get("difficulty")},
            status="success"
        )

        return AssessmentResponse(
            success=True,
            assessment_id=task_id,
            domain=assessment.get("domain"),
            skill_or_subject=assessment.get("skill_or_subject"),
            difficulty=assessment.get("difficulty"),
            questions=assessment.get("questions", []),
            total_questions=assessment.get("total_questions", 0)
        )
        
    except HTTPException:
        if 'trace_id' in locals():
            end_trace(trace_id, output={"error": "HTTP error"}, status="error")
        raise
    except Exception as e:
        if 'trace_id' in locals():
            end_trace(trace_id, output={"error": str(e)}, status="error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit", response_model=EvaluationResponse)
async def submit_assessment(request: SubmitResponsesRequest):
    """
    Submit assessment responses for evaluation.
    
    Evaluates user responses and calculates proficiency score.
    
    Returns:
        Evaluation results with proficiency level and recommendations
    """
    try:
        # Start Opik trace
        trace_id = start_trace(
            "SkillAssessment_Evaluate",
            metadata={"user_id": request.user_id, "domain": request.domain, "skill": request.skill_or_subject, "response_count": len(request.responses)},
            tags=["skill-assessment", "evaluate", request.domain]
        )

        # Create worker instance
        worker = SkillEvaluationAgentWorker()
        
        # Create task
        task_id = await create_agent_task(
            task_type="evaluate_skill_assessment",
            payload={
                "user_id": request.user_id,
                "domain": request.domain,
                "skill_or_subject": request.skill_or_subject,
                "current_phase": request.current_phase,
                "user_responses": request.responses,
                "task_type": "evaluate_skill_assessment"
            }
        )
        
        # Execute
        result = await worker.execute({
            "id": task_id,
            "task_type": "evaluate_skill_assessment",
            "task_payload": {
                "user_id": request.user_id,
                "domain": request.domain,
                "skill_or_subject": request.skill_or_subject,
                "current_phase": request.current_phase,
                "user_responses": request.responses,
                "task_type": "evaluate_skill_assessment"
            }
        })
        
        if not result.get("success"):
            end_trace(trace_id, output={"error": result.get("error")}, status="error")
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to evaluate assessment")
            )
        
        evaluation = result.get("evaluation", {})
        
        score = evaluation.get("raw_score", 0)
        log_metric(trace_id, "raw_score", float(score) if score else 0)
        log_feedback(trace_id, "skill_proficiency", min(10, float(score) / 10) if score else 0, reason=evaluation.get("proficiency_level", "unknown"), evaluator="auto")
        end_trace(
            trace_id,
            output={"score": score, "proficiency": evaluation.get("proficiency_level"), "weak_areas": evaluation.get("weak_areas", [])},
            status="success"
        )

        return EvaluationResponse(
            success=True,
            assessment_id=evaluation.get("assessment_id"),
            domain=evaluation.get("domain"),
            skill_or_subject=evaluation.get("skill_or_subject"),
            raw_score=evaluation.get("raw_score"),
            proficiency_level=evaluation.get("proficiency_level"),
            confidence_level=evaluation.get("confidence_level"),
            weak_areas=evaluation.get("weak_areas", []),
            recommendation=evaluation.get("recommendation")
        )
        
    except HTTPException:
        if 'trace_id' in locals():
            end_trace(trace_id, output={"error": "HTTP error"}, status="error")
        raise
    except Exception as e:
        if 'trace_id' in locals():
            end_trace(trace_id, output={"error": str(e)}, status="error")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/history")
async def get_assessment_history(
    user_id: str,
    domain: Optional[str] = Query(None, pattern="^(tech|medical)$"),
    skill_or_subject: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get assessment history for a user.
    
    Optionally filter by domain and skill.
    
    Returns:
        List of past assessments with scores
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
            params = {
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": limit
            }
            
            if domain:
                params["domain"] = f"eq.{domain}"
            
            if skill_or_subject:
                params["skill_or_subject"] = f"eq.{skill_or_subject}"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params=params
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch assessment history"
                )
            
            assessments = response.json()
            
            return {
                "success": True,
                "user_id": user_id,
                "count": len(assessments),
                "assessments": assessments
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/summary")
async def get_skill_summary(
    user_id: str,
    domain: str = Query(..., pattern="^(tech|medical)$")
):
    """
    Get skill summary for a user in a domain.
    
    Returns:
        Aggregated skill scores and proficiency levels
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get from view
            url = f"{settings.SUPABASE_URL}/rest/v1/v_user_skill_summary"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "domain": f"eq.{domain}"
                }
            )
            
            if response.status_code != 200:
                # Fallback to direct query if view doesn't exist
                url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
                response = await client.get(
                    url,
                    headers=get_supabase_headers(),
                    params={
                        "user_id": f"eq.{user_id}",
                        "domain": f"eq.{domain}",
                        "order": "created_at.desc"
                    }
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to fetch skill summary"
                    )
                
                assessments = response.json()
                
                # Calculate summary manually
                skills = {}
                for a in assessments:
                    skill = a.get("skill_or_subject")
                    if skill not in skills:
                        skills[skill] = {
                            "skill_or_subject": skill,
                            "latest_score": a.get("raw_score"),
                            "proficiency_level": a.get("proficiency_level"),
                            "assessment_count": 0,
                            "scores": []
                        }
                    skills[skill]["assessment_count"] += 1
                    skills[skill]["scores"].append(a.get("raw_score", 0))
                
                # Calculate averages
                skill_list = []
                total_score = 0
                for skill_data in skills.values():
                    avg_score = sum(skill_data["scores"]) / len(skill_data["scores"])
                    skill_data["average_score"] = round(avg_score, 2)
                    del skill_data["scores"]
                    skill_list.append(skill_data)
                    total_score += avg_score
                
                avg_overall = total_score / len(skill_list) if skill_list else 0
                
                return {
                    "success": True,
                    "user_id": user_id,
                    "domain": domain,
                    "total_assessments": len(assessments),
                    "average_score": round(avg_overall, 2),
                    "skills": skill_list
                }
            
            summary = response.json()
            
            return {
                "success": True,
                "user_id": user_id,
                "domain": domain,
                "summary": summary
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/weak-areas")
async def get_weak_areas(
    user_id: str,
    domain: str = Query(..., pattern="^(tech|medical)$")
):
    """
    Get weak areas for a user based on assessment history.
    
    Returns:
        List of topics/skills where user needs improvement
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try view first
            url = f"{settings.SUPABASE_URL}/rest/v1/v_user_weak_areas"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "domain": f"eq.{domain}"
                }
            )
            
            if response.status_code != 200:
                # Fallback
                url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
                response = await client.get(
                    url,
                    headers=get_supabase_headers(),
                    params={
                        "user_id": f"eq.{user_id}",
                        "domain": f"eq.{domain}",
                        "select": "weak_areas",
                        "order": "created_at.desc",
                        "limit": 10
                    }
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail="Failed to fetch weak areas"
                    )
                
                assessments = response.json()
                
                # Aggregate weak areas
                weak_area_counts = {}
                for a in assessments:
                    for area in (a.get("weak_areas") or []):
                        weak_area_counts[area] = weak_area_counts.get(area, 0) + 1
                
                # Sort by frequency
                sorted_areas = sorted(
                    weak_area_counts.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                
                return {
                    "success": True,
                    "user_id": user_id,
                    "domain": domain,
                    "weak_areas": [
                        {"topic": area, "frequency": count}
                        for area, count in sorted_areas
                    ]
                }
            
            weak_areas = response.json()
            
            return {
                "success": True,
                "user_id": user_id,
                "domain": domain,
                "weak_areas": weak_areas
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/can-retake")
async def check_retake_availability(
    user_id: str,
    skill_or_subject: str
):
    """
    Check if user can retake an assessment.
    
    Assessments have a cooldown period before retake is allowed.
    
    Returns:
        Retake availability status
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get latest assessment for this skill
            url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "skill_or_subject": f"eq.{skill_or_subject}",
                    "order": "created_at.desc",
                    "limit": 1
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to check retake availability"
                )
            
            assessments = response.json()
            
            if not assessments:
                # No previous assessment, can take
                return {
                    "success": True,
                    "can_retake": True,
                    "message": "No previous assessment found. You can take this assessment."
                }
            
            latest = assessments[0]
            retake_available_at = latest.get("retake_available_at")
            
            if retake_available_at:
                retake_time = datetime.fromisoformat(retake_available_at.replace("Z", "+00:00"))
                now = datetime.utcnow().replace(tzinfo=retake_time.tzinfo)
                
                if now >= retake_time:
                    return {
                        "success": True,
                        "can_retake": True,
                        "message": "Cooldown period has passed. You can retake this assessment."
                    }
                else:
                    return {
                        "success": True,
                        "can_retake": False,
                        "retake_available_at": retake_available_at,
                        "message": f"Please wait until {retake_available_at} to retake this assessment."
                    }
            
            # No cooldown set, allow retake
            return {
                "success": True,
                "can_retake": True,
                "message": "You can retake this assessment."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/latest/{skill_or_subject}")
async def get_latest_assessment(
    user_id: str,
    skill_or_subject: str
):
    """
    Get the latest assessment for a specific skill.
    
    Returns:
        Latest assessment result with score and recommendations
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "skill_or_subject": f"eq.{skill_or_subject}",
                    "order": "created_at.desc",
                    "limit": 1
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch latest assessment"
                )
            
            assessments = response.json()
            
            if not assessments:
                return {
                    "success": True,
                    "found": False,
                    "message": "No assessment found for this skill."
                }
            
            return {
                "success": True,
                "found": True,
                "assessment": assessments[0]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/improvement")
async def get_skill_improvement(
    user_id: str,
    skill_or_subject: str,
    limit: int = Query(10, ge=2, le=50)
):
    """
    Get skill improvement over time.
    
    Returns:
        Score history for tracking improvement
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/skill_assessments"
            
            response = await client.get(
                url,
                headers=get_supabase_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "skill_or_subject": f"eq.{skill_or_subject}",
                    "select": "id,raw_score,proficiency_level,created_at",
                    "order": "created_at.asc",
                    "limit": limit
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch improvement data"
                )
            
            assessments = response.json()
            
            if len(assessments) < 2:
                return {
                    "success": True,
                    "skill_or_subject": skill_or_subject,
                    "has_improvement_data": False,
                    "message": "Need at least 2 assessments to show improvement."
                }
            
            # Calculate improvement
            first_score = assessments[0].get("raw_score", 0)
            last_score = assessments[-1].get("raw_score", 0)
            improvement = last_score - first_score
            
            return {
                "success": True,
                "skill_or_subject": skill_or_subject,
                "has_improvement_data": True,
                "first_score": first_score,
                "latest_score": last_score,
                "improvement": round(improvement, 2),
                "improvement_percentage": round((improvement / first_score * 100) if first_score > 0 else 0, 2),
                "history": assessments
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
