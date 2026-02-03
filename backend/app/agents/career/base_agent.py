"""
Base Agent Class

All Career Intelligence agents inherit from this base class.
Provides common functionality for logging, LLM calls, and Supabase operations.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
import json
import uuid

from app.db.supabase_client import get_supabase_client
from app.agents.llm import call_gemini_sync


class BaseAgent(ABC):
    """
    Abstract base class for all Career Intelligence agents.
    
    Agents are stateless - Supabase is the memory store.
    Every action is logged to agent_activity_log.
    """
    
    agent_name: str = "BaseAgent"
    agent_description: str = "Base agent class"
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    @abstractmethod
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's main task.
        
        Args:
            user_id: The user's ID
            context: Task-specific context and parameters
            
        Returns:
            Dict containing the agent's output
        """
        pass
    
    async def log_activity(
        self,
        user_id: str,
        action: str,
        input_summary: str,
        output_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log agent activity to the agent_activity_log table.
        
        Args:
            user_id: The user's ID
            action: Description of the action taken
            input_summary: Summary of input data
            output_summary: Summary of output/result
            metadata: Additional metadata to store
        """
        try:
            log_entry = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "agent_name": self.agent_name,
                "action": action,
                "input_summary": input_summary,
                "output_summary": output_summary,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("agent_activity_log").insert(log_entry).execute()
        except Exception as e:
            print(f"Failed to log agent activity: {e}")
    
    async def call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Call the LLM with the given prompt.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            temperature: LLM temperature (0-1)
            max_tokens: Maximum tokens in response
            
        Returns:
            The LLM response text
        """
        full_prompt = f"{system_prompt or self._get_system_prompt()}\n\n{prompt}"
        return call_gemini_sync(full_prompt)
    
    def _get_system_prompt(self) -> str:
        """Get the default system prompt for this agent."""
        return f"""You are {self.agent_name}, an AI assistant specialized in career guidance.
{self.agent_description}
Always provide helpful, actionable advice tailored to the user's specific situation."""
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the user's career profile from Supabase."""
        try:
            result = self.supabase.table("user_career_profile")\
                .select("*")\
                .eq("user_id", user_id)\
                .single()\
                .execute()
            return result.data
        except Exception:
            return None
    
    async def get_user_skills(self, user_id: str) -> list:
        """Fetch the user's skills from Supabase."""
        try:
            result = self.supabase.table("user_skills")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            return result.data or []
        except Exception:
            return []
    
    async def get_user_roadmap(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the user's career roadmap from Supabase."""
        try:
            result = self.supabase.table("career_roadmap")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .single()\
                .execute()
            return result.data
        except Exception:
            return None
    
    async def get_assessment_results(self, user_id: str) -> list:
        """Fetch the user's assessment results from Supabase."""
        try:
            result = self.supabase.table("skill_assessments")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            return result.data or []
        except Exception:
            return []
