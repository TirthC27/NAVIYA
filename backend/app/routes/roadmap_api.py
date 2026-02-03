"""
Career Roadmap API Routes

Endpoints for roadmap retrieval and phase progress management.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
import httpx

from app.config import settings


router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])

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
# Roadmap Retrieval Endpoints
# ============================================

@router.get("/{user_id}")
async def get_user_roadmap(user_id: str):
    """
    Get the active roadmap for a user.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Active roadmap with phase progress
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "*"
                }
            )
            
            if roadmap_response.status_code != 200:
                raise HTTPException(
                    status_code=roadmap_response.status_code,
                    detail=f"Failed to fetch roadmap: {roadmap_response.text}"
                )
            
            roadmaps = roadmap_response.json()
            
            if not roadmaps:
                return {
                    "success": True,
                    "has_roadmap": False,
                    "roadmap": None,
                    "phase_progress": []
                }
            
            roadmap = roadmaps[0]
            roadmap_id = roadmap["id"]
            
            # Get phase progress
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            progress_response = await client.get(
                progress_url,
                headers=get_headers(),
                params={
                    "roadmap_id": f"eq.{roadmap_id}",
                    "select": "*",
                    "order": "phase_number.asc"
                }
            )
            
            phase_progress = []
            if progress_response.status_code == 200:
                phase_progress = progress_response.json()
            
            return {
                "success": True,
                "has_roadmap": True,
                "roadmap": {
                    "id": roadmap["id"],
                    "domain": roadmap["domain"],
                    "roadmap_version": roadmap["roadmap_version"],
                    "confidence_level": roadmap["confidence_level"],
                    "overall_duration_estimate": roadmap["overall_duration_estimate"],
                    "phases": roadmap["roadmap_json"].get("phases", []),
                    "created_at": roadmap["created_at"]
                },
                "phase_progress": phase_progress
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/{user_id}/summary")
async def get_roadmap_summary(user_id: str):
    """
    Get a summary of the user's roadmap progress.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Summary with completion stats
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "id,domain,roadmap_json,confidence_level,overall_duration_estimate"
                }
            )
            
            if roadmap_response.status_code != 200 or not roadmap_response.json():
                return {
                    "success": True,
                    "has_roadmap": False
                }
            
            roadmap = roadmap_response.json()[0]
            roadmap_id = roadmap["id"]
            phases = roadmap["roadmap_json"].get("phases", [])
            
            # Get phase progress
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            progress_response = await client.get(
                progress_url,
                headers=get_headers(),
                params={
                    "roadmap_id": f"eq.{roadmap_id}",
                    "select": "phase_number,status,progress_percentage"
                }
            )
            
            phase_progress = progress_response.json() if progress_response.status_code == 200 else []
            
            # Calculate stats
            total_phases = len(phases)
            completed = sum(1 for p in phase_progress if p["status"] == "completed")
            active_phase = next((p for p in phase_progress if p["status"] == "active"), None)
            
            return {
                "success": True,
                "has_roadmap": True,
                "summary": {
                    "domain": roadmap["domain"],
                    "total_phases": total_phases,
                    "completed_phases": completed,
                    "current_phase": active_phase["phase_number"] if active_phase else 1,
                    "overall_progress": round((completed / total_phases) * 100) if total_phases > 0 else 0,
                    "duration_estimate": roadmap["overall_duration_estimate"],
                    "confidence_level": roadmap["confidence_level"]
                }
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.get("/{user_id}/current-phase")
async def get_current_phase(user_id: str):
    """
    Get details of the current active phase.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Current phase details with progress
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "id,roadmap_json"
                }
            )
            
            if roadmap_response.status_code != 200 or not roadmap_response.json():
                return {
                    "success": True,
                    "has_current_phase": False
                }
            
            roadmap = roadmap_response.json()[0]
            roadmap_id = roadmap["id"]
            phases = roadmap["roadmap_json"].get("phases", [])
            
            # Get active phase progress
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            progress_response = await client.get(
                progress_url,
                headers=get_headers(),
                params={
                    "roadmap_id": f"eq.{roadmap_id}",
                    "status": "eq.active",
                    "select": "*"
                }
            )
            
            if progress_response.status_code != 200 or not progress_response.json():
                return {
                    "success": True,
                    "has_current_phase": False
                }
            
            progress = progress_response.json()[0]
            phase_number = progress["phase_number"]
            
            # Find phase data
            phase_data = next(
                (p for p in phases if p["phase_number"] == phase_number),
                None
            )
            
            if not phase_data:
                return {
                    "success": True,
                    "has_current_phase": False
                }
            
            return {
                "success": True,
                "has_current_phase": True,
                "current_phase": {
                    **phase_data,
                    "progress_percentage": progress["progress_percentage"],
                    "started_at": progress["started_at"]
                }
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Phase Progress Update Endpoints
# ============================================

@router.post("/{user_id}/phase/{phase_number}/progress")
async def update_phase_progress(
    user_id: str,
    phase_number: int,
    progress_percentage: int
):
    """
    Update progress for a specific phase.
    
    Args:
        user_id: User's UUID
        phase_number: Phase number to update
        progress_percentage: New progress value (0-100)
        
    Returns:
        Updated progress data
    """
    if progress_percentage < 0 or progress_percentage > 100:
        raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "id"
                }
            )
            
            if roadmap_response.status_code != 200 or not roadmap_response.json():
                raise HTTPException(status_code=404, detail="No active roadmap found")
            
            roadmap_id = roadmap_response.json()[0]["id"]
            
            # Update phase progress
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            update_response = await client.patch(
                f"{progress_url}?roadmap_id=eq.{roadmap_id}&phase_number=eq.{phase_number}",
                headers=get_headers(),
                json={
                    "progress_percentage": progress_percentage
                }
            )
            
            if update_response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=update_response.status_code,
                    detail=f"Failed to update progress: {update_response.text}"
                )
            
            return {
                "success": True,
                "message": f"Phase {phase_number} progress updated to {progress_percentage}%"
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


@router.post("/{user_id}/phase/{phase_number}/complete")
async def complete_phase(user_id: str, phase_number: int):
    """
    Mark a phase as completed and unlock the next phase.
    
    Args:
        user_id: User's UUID
        phase_number: Phase number to complete
        
    Returns:
        Completion status and next phase info
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "id,roadmap_json"
                }
            )
            
            if roadmap_response.status_code != 200 or not roadmap_response.json():
                raise HTTPException(status_code=404, detail="No active roadmap found")
            
            roadmap = roadmap_response.json()[0]
            roadmap_id = roadmap["id"]
            total_phases = len(roadmap["roadmap_json"].get("phases", []))
            
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            
            # Mark current phase as completed
            await client.patch(
                f"{progress_url}?roadmap_id=eq.{roadmap_id}&phase_number=eq.{phase_number}",
                headers=get_headers(),
                json={
                    "status": "completed",
                    "progress_percentage": 100,
                    "completed_at": "now()"
                }
            )
            
            # Unlock next phase if exists
            next_phase = phase_number + 1
            next_unlocked = False
            
            if next_phase <= total_phases:
                unlock_response = await client.patch(
                    f"{progress_url}?roadmap_id=eq.{roadmap_id}&phase_number=eq.{next_phase}",
                    headers=get_headers(),
                    json={
                        "status": "active",
                        "started_at": "now()"
                    }
                )
                next_unlocked = unlock_response.status_code in [200, 204]
            
            return {
                "success": True,
                "phase_completed": phase_number,
                "next_phase_unlocked": next_unlocked,
                "next_phase_number": next_phase if next_unlocked else None,
                "roadmap_completed": next_phase > total_phases
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")


# ============================================
# Dashboard Data Endpoint
# ============================================

@router.get("/{user_id}/dashboard")
async def get_roadmap_dashboard(user_id: str):
    """
    Get all roadmap data formatted for dashboard display.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Complete roadmap data with phases and progress
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get active roadmap
            roadmap_url = f"{SUPABASE_REST_URL}/career_roadmap"
            roadmap_response = await client.get(
                roadmap_url,
                headers=get_headers(),
                params={
                    "user_id": f"eq.{user_id}",
                    "is_active": "eq.true",
                    "select": "*"
                }
            )
            
            if roadmap_response.status_code != 200 or not roadmap_response.json():
                return {
                    "success": True,
                    "has_roadmap": False,
                    "message": "No roadmap generated yet"
                }
            
            roadmap = roadmap_response.json()[0]
            roadmap_id = roadmap["id"]
            phases = roadmap["roadmap_json"].get("phases", [])
            
            # Get phase progress
            progress_url = f"{SUPABASE_REST_URL}/roadmap_phase_progress"
            progress_response = await client.get(
                progress_url,
                headers=get_headers(),
                params={
                    "roadmap_id": f"eq.{roadmap_id}",
                    "select": "*",
                    "order": "phase_number.asc"
                }
            )
            
            phase_progress = progress_response.json() if progress_response.status_code == 200 else []
            
            # Calculate stats
            completed = sum(1 for p in phase_progress if p["status"] == "completed")
            active = next((p for p in phase_progress if p["status"] == "active"), None)
            
            return {
                "success": True,
                "has_roadmap": True,
                "roadmap": {
                    "id": roadmap_id,
                    "domain": roadmap["domain"],
                    "roadmap_version": roadmap["roadmap_version"],
                    "confidence_level": roadmap["confidence_level"],
                    "overall_duration_estimate": roadmap["overall_duration_estimate"],
                    "phases": phases,
                    "created_at": roadmap["created_at"]
                },
                "phase_progress": phase_progress,
                "stats": {
                    "total_phases": len(phases),
                    "completed_phases": completed,
                    "current_phase_number": active["phase_number"] if active else 1,
                    "overall_progress_percentage": round((completed / len(phases)) * 100) if phases else 0
                }
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
