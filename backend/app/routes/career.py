"""
Career Intelligence API Routes

FastAPI routes for the Career Intelligence module.
All routes interact with the career agents.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json

from app.agents.career import (
    SupervisorAgent,
    RoadmapAgent,
    SkillExtractorAgent,
    AssessmentAgent,
    InterviewAgent,
    MentorAgent
)

router = APIRouter(prefix="/career", tags=["career"])

# Initialize agents
supervisor = SupervisorAgent()
roadmap_agent = RoadmapAgent()
skill_extractor = SkillExtractorAgent()
assessment_agent = AssessmentAgent()
interview_agent = InterviewAgent()
mentor_agent = MentorAgent()


# ============== Pydantic Models ==============

class CareerProfileCreate(BaseModel):
    target_role: str
    current_role: Optional[str] = None
    experience_level: str = "beginner"
    timeline_months: int = 12


class RoadmapGenerate(BaseModel):
    target_role: str
    timeline_months: int = 12
    experience_level: str = "beginner"


class RoadmapProgressUpdate(BaseModel):
    roadmap_id: str
    phase_id: str
    progress: int
    completed: bool = False


class AssessmentStart(BaseModel):
    skill_name: str
    difficulty: str = "intermediate"
    num_questions: int = 5


class AssessmentSubmit(BaseModel):
    assessment_id: str
    answers: Dict[str, str]  # {question_id: "A"}


class InterviewStart(BaseModel):
    interview_type: str = "behavioral"
    target_role: str
    difficulty: str = "mid"


class InterviewAnswer(BaseModel):
    interview_id: str
    question_index: int
    answer: str


class MentorMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


# ============== Dashboard Routes ==============

@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    """Get comprehensive dashboard data for the user."""
    try:
        data = await supervisor.get_dashboard_data(user_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/next-action/{user_id}")
async def get_next_action(user_id: str):
    """Get the next recommended action for the user."""
    try:
        action = await supervisor.get_next_best_action(user_id)
        return action
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Profile Routes ==============

@router.post("/profile/{user_id}")
async def create_profile(user_id: str, profile: CareerProfileCreate):
    """Create or update user's career profile."""
    from app.db.supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("user_career_profile").upsert({
            "user_id": user_id,
            "target_role": profile.target_role,
            "current_role": profile.current_role,
            "experience_level": profile.experience_level,
            "timeline_months": profile.timeline_months,
            "total_xp": 0
        }, on_conflict="user_id").execute()
        
        return {"success": True, "profile": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Get user's career profile."""
    profile = await supervisor.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ============== Roadmap Routes ==============

@router.post("/roadmap/generate/{user_id}")
async def generate_roadmap(user_id: str, data: RoadmapGenerate):
    """Generate a new career roadmap."""
    try:
        roadmap = await roadmap_agent.execute(user_id, {
            "action": "generate",
            "target_role": data.target_role,
            "timeline_months": data.timeline_months,
            "experience_level": data.experience_level
        })
        return roadmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roadmap/{user_id}")
async def get_roadmap(user_id: str):
    """Get user's current roadmap."""
    try:
        roadmap = await roadmap_agent.execute(user_id, {"action": "get_current"})
        return roadmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/roadmap/progress/{user_id}")
async def update_roadmap_progress(user_id: str, data: RoadmapProgressUpdate):
    """Update progress on a roadmap phase."""
    try:
        result = await roadmap_agent.execute(user_id, {
            "action": "update_progress",
            "roadmap_id": data.roadmap_id,
            "phase_id": data.phase_id,
            "progress": data.progress,
            "completed": data.completed
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Resume/Skills Routes ==============

@router.post("/resume/upload/{user_id}")
async def upload_resume(
    user_id: str,
    file: UploadFile = File(...)
):
    """Upload and analyze a resume."""
    try:
        # Read file content
        content = await file.read()
        text = content.decode("utf-8")
        
        # Extract skills
        result = await skill_extractor.execute(user_id, {
            "action": "extract",
            "resume_text": text
        })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume/analyze-text/{user_id}")
async def analyze_resume_text(user_id: str, resume_text: str = Form(...)):
    """Analyze resume from text input."""
    try:
        result = await skill_extractor.execute(user_id, {
            "action": "extract",
            "resume_text": resume_text
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/{user_id}")
async def get_skills(user_id: str):
    """Get user's skills."""
    skills = await supervisor.get_user_skills(user_id)
    return {"skills": skills}


@router.post("/skills/gaps/{user_id}")
async def analyze_skill_gaps(user_id: str, target_role: str = Form(...)):
    """Analyze skill gaps for a target role."""
    try:
        result = await skill_extractor.execute(user_id, {
            "action": "analyze_gaps",
            "target_role": target_role
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/recommendations/{user_id}")
async def get_role_recommendations(user_id: str):
    """Get recommended roles based on skills."""
    try:
        result = await skill_extractor.execute(user_id, {
            "action": "recommend_roles"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Assessment Routes ==============

@router.post("/assessment/start/{user_id}")
async def start_assessment(user_id: str, data: AssessmentStart):
    """Start a new skill assessment."""
    try:
        result = await assessment_agent.execute(user_id, {
            "action": "generate",
            "skill_name": data.skill_name,
            "difficulty": data.difficulty,
            "num_questions": data.num_questions
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assessment/submit/{user_id}")
async def submit_assessment(user_id: str, data: AssessmentSubmit):
    """Submit assessment answers for evaluation."""
    try:
        result = await assessment_agent.execute(user_id, {
            "action": "evaluate",
            "assessment_id": data.assessment_id,
            "answers": data.answers
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessment/history/{user_id}")
async def get_assessment_history(user_id: str):
    """Get user's assessment history."""
    try:
        result = await assessment_agent.execute(user_id, {
            "action": "get_history"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Interview Routes ==============

@router.post("/interview/start/{user_id}")
async def start_interview(user_id: str, data: InterviewStart):
    """Start a new mock interview."""
    try:
        result = await interview_agent.execute(user_id, {
            "action": "start",
            "interview_type": data.interview_type,
            "target_role": data.target_role,
            "difficulty": data.difficulty
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/answer/{user_id}")
async def submit_interview_answer(user_id: str, data: InterviewAnswer):
    """Submit an answer during the interview."""
    try:
        result = await interview_agent.execute(user_id, {
            "action": "submit_answer",
            "interview_id": data.interview_id,
            "question_index": data.question_index,
            "answer": data.answer
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/complete/{user_id}")
async def complete_interview(user_id: str, interview_id: str = Form(...)):
    """Complete an interview and get final feedback."""
    try:
        result = await interview_agent.execute(user_id, {
            "action": "complete",
            "interview_id": interview_id
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interview/history/{user_id}")
async def get_interview_history(user_id: str):
    """Get user's interview history."""
    try:
        result = await interview_agent.execute(user_id, {
            "action": "get_history"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Mentor Routes ==============

@router.post("/mentor/chat/{user_id}")
async def mentor_chat(user_id: str, data: MentorMessage):
    """Send a message to the AI mentor."""
    try:
        result = await mentor_agent.execute(user_id, {
            "action": "chat",
            "message": data.message,
            "session_id": data.session_id
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mentor/session/{user_id}")
async def start_mentor_session(user_id: str):
    """Start a new mentor session."""
    try:
        result = await mentor_agent.execute(user_id, {
            "action": "start_session"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mentor/suggestion/{user_id}")
async def get_mentor_suggestion(user_id: str):
    """Get the mentor's next suggestion."""
    try:
        result = await mentor_agent.execute(user_id, {
            "action": "get_suggestion"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mentor/sessions/{user_id}")
async def get_mentor_sessions(user_id: str):
    """Get user's mentor session history."""
    try:
        result = await mentor_agent.execute(user_id, {
            "action": "get_sessions"
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Activity Log ==============

@router.get("/activity/{user_id}")
async def get_activity_log(user_id: str, limit: int = 10):
    """Get recent agent activity for the user."""
    from app.db.supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("agent_activity_log")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return {"activity": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
