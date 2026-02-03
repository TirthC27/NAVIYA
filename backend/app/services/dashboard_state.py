"""
Dashboard State Service

Provides functions for agents to update dashboard_state table.
This is the ONLY way agents should update dashboard state.
"""

import httpx
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from app.config import settings


class DashboardStateService:
    """
    Service for agents to update dashboard_state.
    
    Usage:
        service = DashboardStateService()
        await service.mark_resume_ready(user_id)
        await service.mark_roadmap_ready(user_id, phase="foundation")
    """
    
    def __init__(self):
        self.rest_url = f"{settings.SUPABASE_URL}/rest/v1"
        self.rpc_url = f"{settings.SUPABASE_URL}/rest/v1/rpc"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get Supabase headers"""
        return {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def initialize_state(self, user_id: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """
        Initialize dashboard state for a new user.
        Called during onboarding.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.rpc_url}/initialize_dashboard_state",
                headers=self._get_headers(),
                json={
                    "p_user_id": user_id,
                    "p_domain": domain
                }
            )
            
            if response.status_code == 200:
                return {"success": True, "state": response.json()}
            else:
                # Fallback: direct insert
                return await self._direct_upsert(user_id, {
                    "domain": domain,
                    "current_phase": "onboarding"
                }, "System")
    
    async def get_state(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get current dashboard state for a user"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.rest_url}/dashboard_state",
                headers=self._get_headers(),
                params={"user_id": f"eq.{user_id}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            return None
    
    async def mark_resume_ready(self, user_id: str) -> Dict[str, Any]:
        """
        Mark resume as analyzed and ready.
        Called by ResumeIntelligenceAgent.
        """
        return await self._update_state(
            user_id=user_id,
            agent_name="ResumeIntelligenceAgent",
            updates={"resume_ready": True}
        )
    
    async def mark_roadmap_ready(
        self, 
        user_id: str, 
        phase: str = "foundation",
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mark roadmap as generated and ready.
        Called by RoadmapAgent.
        """
        updates = {
            "roadmap_ready": True,
            "current_phase": phase
        }
        if domain:
            updates["domain"] = domain
            
        return await self._update_state(
            user_id=user_id,
            agent_name="RoadmapAgent",
            updates=updates
        )
    
    async def mark_skill_eval_ready(self, user_id: str) -> Dict[str, Any]:
        """
        Mark skill evaluation as completed.
        Called by SkillEvaluationAgent.
        """
        return await self._update_state(
            user_id=user_id,
            agent_name="SkillEvaluationAgent",
            updates={"skill_eval_ready": True}
        )
    
    async def mark_interview_ready(self, user_id: str) -> Dict[str, Any]:
        """
        Mark user as ready for mock interviews.
        Called after sufficient skill assessments.
        """
        return await self._update_state(
            user_id=user_id,
            agent_name="InterviewAgent",
            updates={"interview_ready": True}
        )
    
    async def update_phase(self, user_id: str, phase: str, agent_name: str) -> Dict[str, Any]:
        """
        Update current learning phase.
        """
        return await self._update_state(
            user_id=user_id,
            agent_name=agent_name,
            updates={"current_phase": phase}
        )
    
    async def _update_state(
        self, 
        user_id: str, 
        agent_name: str, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Internal method to update dashboard state.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try RPC function first
            rpc_params = {
                "p_user_id": user_id,
                "p_agent_name": agent_name,
                "p_resume_ready": updates.get("resume_ready"),
                "p_roadmap_ready": updates.get("roadmap_ready"),
                "p_skill_eval_ready": updates.get("skill_eval_ready"),
                "p_interview_ready": updates.get("interview_ready"),
                "p_current_phase": updates.get("current_phase"),
                "p_domain": updates.get("domain")
            }
            
            # Remove None values
            rpc_params = {k: v for k, v in rpc_params.items() if v is not None}
            
            response = await client.post(
                f"{self.rpc_url}/update_dashboard_state",
                headers=self._get_headers(),
                json=rpc_params
            )
            
            if response.status_code == 200:
                return {"success": True, "state": response.json()}
            else:
                # Fallback: direct update
                return await self._direct_upsert(user_id, updates, agent_name)
    
    async def _direct_upsert(
        self, 
        user_id: str, 
        updates: Dict[str, Any],
        agent_name: str
    ) -> Dict[str, Any]:
        """
        Direct upsert when RPC is not available.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check if exists
            check_response = await client.get(
                f"{self.rest_url}/dashboard_state",
                headers=self._get_headers(),
                params={"user_id": f"eq.{user_id}"}
            )
            
            exists = check_response.status_code == 200 and len(check_response.json()) > 0
            
            data = {
                **updates,
                "user_id": user_id,
                "last_updated_by_agent": agent_name,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if exists:
                # Update
                response = await client.patch(
                    f"{self.rest_url}/dashboard_state",
                    headers=self._get_headers(),
                    params={"user_id": f"eq.{user_id}"},
                    json=data
                )
            else:
                # Insert
                data["created_at"] = datetime.utcnow().isoformat()
                response = await client.post(
                    f"{self.rest_url}/dashboard_state",
                    headers=self._get_headers(),
                    json=data
                )
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {"success": True, "state": result[0] if result else data}
            else:
                return {
                    "success": False, 
                    "error": f"Failed to update: {response.status_code} - {response.text}"
                }


# Singleton instance
_service_instance: Optional[DashboardStateService] = None


def get_dashboard_state_service() -> DashboardStateService:
    """Get singleton DashboardStateService instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = DashboardStateService()
    return _service_instance
