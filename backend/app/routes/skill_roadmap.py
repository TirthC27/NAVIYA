"""
Skill Roadmap API Routes
Thin routing layer that delegates to the SkillRoadmapAgent.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import sys
from pathlib import Path

# Add Agents directory to path
agents_path = Path(__file__).parent.parent.parent / "Agents"
if str(agents_path) not in sys.path:
    sys.path.insert(0, str(agents_path))

from skill_roadmap_agent import SkillRoadmapAgent, AgentConfig

router = APIRouter(prefix="/api/skill-roadmap", tags=["Skill Roadmap"])


# ============================================
# Dependency Injection (Cloud Run Compatible)
# ============================================
def get_skill_roadmap_agent():
    """Factory function for SkillRoadmapAgent - creates instance on demand"""
    agent_config = AgentConfig.from_env()
    return SkillRoadmapAgent(agent_config)


# ============================================

# ============================================
# Request/Response Models
# ============================================

class GenerateRoadmapRequest(BaseModel):
    user_id: str
    career_goal: str
    preferred_language: Optional[str] = "English"


class VideoSearchRequest(BaseModel):
    query: str
    preferred_language: Optional[str] = "English"
    max_results: Optional[int] = 1


class VideoProgressRequest(BaseModel):
    user_id: str
    roadmap_id: str
    node_id: str
    video_id: str
    video_title: Optional[str] = None
    duration_seconds: int
    watched_seconds: int


# ============================================
# Endpoints
# ============================================


@router.post("/generate")
async def generate_skill_roadmap(req: GenerateRoadmapRequest, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """
    Generate a skill-gap roadmap using the SkillRoadmapAgent.
    """
    result = await agent.generate_roadmap(
        user_id=req.user_id,
        career_goal=req.career_goal,
        preferred_language=req.preferred_language or "English"
    )
    
    if not result.get("success"):
        raise HTTPException(500, result.get("error", "Failed to generate roadmap"))
    
    return result


@router.get("/saved/{user_id}")
async def get_saved_roadmap(user_id: str, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """Get the most recent saved roadmap for a user"""
    history = await agent.get_roadmap_history(user_id, limit=1)
    if not history:
        raise HTTPException(404, "No saved roadmap found")
    
    roadmap = await agent.load_roadmap_by_id(history[0]["id"])
    if not roadmap:
        raise HTTPException(404, "No saved roadmap found")
    
    return {
        "success": True,
        **roadmap
    }


@router.get("/history/{user_id}")
async def get_roadmap_history(user_id: str, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """Get all saved roadmaps for a user"""
    history = await agent.get_roadmap_history(user_id, limit=20)
    return {"success": True, "history": history}


@router.get("/load/{roadmap_id}")
async def load_roadmap_by_id(roadmap_id: str, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """Load a specific roadmap by ID"""
    roadmap = await agent.load_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise HTTPException(404, "Roadmap not found")
    
    return {
        "success": True,
        **roadmap
    }


@router.post("/videos")
async def get_skill_videos(req: VideoSearchRequest, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """
    Fetch YouTube tutorial videos for a specific skill.
    """
    videos = await agent.fetch_videos_for_skill(
        search_query=req.query,
        preferred_language=req.preferred_language or "English",
        max_results=req.max_results or 1
    )
    
    return {
        "success": True,
        "videos": videos,
        "query": req.query,
        "total_found": len(videos)
    }


# ============================================
# Video Watch Progress Endpoints
# ============================================

@router.post("/video-progress")
async def save_video_progress(req: VideoProgressRequest, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """
    Save or update video watch progress.
    Auto-marks completed when watched >= 80% of duration.
    """
    import httpx
    from datetime import datetime

    completed = req.duration_seconds > 0 and req.watched_seconds >= req.duration_seconds

    payload = {
        "user_id": req.user_id,
        "roadmap_id": req.roadmap_id,
        "node_id": req.node_id,
        "video_id": req.video_id,
        "video_title": req.video_title,
        "duration_seconds": req.duration_seconds,
        "watched_seconds": req.watched_seconds,
        "completed": completed,
        "last_watched_at": datetime.utcnow().isoformat(),
    }

    headers = agent._get_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Check if record exists (upsert)
            check_url = (
                f"{agent.supabase_rest_url}/video_watch_progress"
                f"?user_id=eq.{req.user_id}"
                f"&roadmap_id=eq.{req.roadmap_id}"
                f"&node_id=eq.{req.node_id}"
                f"&video_id=eq.{req.video_id}"
                f"&select=id,watched_seconds,completed"
            )
            check = await client.get(check_url, headers=headers)

            if check.status_code == 200 and check.json():
                existing = check.json()[0]
                # Only update if more progress or not yet completed
                if req.watched_seconds > existing.get("watched_seconds", 0) or (completed and not existing.get("completed")):
                    row_id = existing["id"]
                    url = f"{agent.supabase_rest_url}/video_watch_progress?id=eq.{row_id}"
                    resp = await client.patch(url, headers=headers, json=payload)
                else:
                    return {
                        "success": True,
                        "completed": existing.get("completed", False),
                        "watched_seconds": existing.get("watched_seconds", 0),
                        "message": "No update needed"
                    }
            else:
                # Insert new
                payload["created_at"] = datetime.utcnow().isoformat()
                url = f"{agent.supabase_rest_url}/video_watch_progress"
                resp = await client.post(url, headers=headers, json=payload)

        return {
            "success": True,
            "completed": completed,
            "watched_seconds": req.watched_seconds,
            "progress_percent": round((req.watched_seconds / max(req.duration_seconds, 1)) * 100)
        }

    except Exception as e:
        print(f"[VideoProgress] Error saving: {e}")
        raise HTTPException(500, f"Failed to save progress: {str(e)}")


@router.get("/video-progress/{user_id}/{roadmap_id}")
async def get_video_progress(user_id: str, roadmap_id: str, agent: SkillRoadmapAgent = Depends(get_skill_roadmap_agent)):
    """
    Get all video watch progress for a user's roadmap.
    Returns a dict keyed by node_id for easy lookup.
    """
    import httpx

    headers = agent._get_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = (
                f"{agent.supabase_rest_url}/video_watch_progress"
                f"?user_id=eq.{user_id}"
                f"&roadmap_id=eq.{roadmap_id}"
                f"&select=node_id,video_id,video_title,duration_seconds,watched_seconds,completed,last_watched_at"
            )
            resp = await client.get(url, headers=headers)

            if resp.status_code == 200:
                rows = resp.json()
                # Build dict keyed by node_id
                progress = {}
                for row in rows:
                    node_id = row["node_id"]
                    progress[node_id] = {
                        "video_id": row["video_id"],
                        "video_title": row.get("video_title"),
                        "duration_seconds": row["duration_seconds"],
                        "watched_seconds": row["watched_seconds"],
                        "completed": row["completed"],
                        "progress_percent": round((row["watched_seconds"] / max(row["duration_seconds"], 1)) * 100),
                        "last_watched_at": row.get("last_watched_at"),
                    }
                return {"success": True, "progress": progress}

        return {"success": True, "progress": {}}

    except Exception as e:
        print(f"[VideoProgress] Error fetching: {e}")
        raise HTTPException(500, f"Failed to fetch progress: {str(e)}")
