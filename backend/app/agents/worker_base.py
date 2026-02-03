"""
AgentWorker Base Interface

Every agent worker MUST implement this interface.
Agents NEVER call each other - they only communicate through the database.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime


# ============================================
# Execution Result Schema
# ============================================

class TaskResult(BaseModel):
    """Standardized result from agent execution"""
    success: bool
    output: Dict[str, Any] = {}
    error: Optional[str] = None
    summary: str = ""  # Human-readable summary for logging
    tables_updated: List[str] = []  # Tables this agent wrote to
    execution_time_ms: int = 0


# ============================================
# AgentWorker Interface
# ============================================

class AgentWorker(ABC):
    """
    Base interface for all agent workers.
    
    Every agent MUST implement:
    - agent_name: Unique identifier for the agent
    - supported_task_types: List of task types this agent handles
    - execute: Core logic that processes a task
    
    Agents MUST NOT:
    - Call other agents directly
    - Update task status (executor handles this)
    - Access frontend state
    """
    
    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Unique identifier for this agent"""
        pass
    
    @property
    @abstractmethod
    def supported_task_types(self) -> List[str]:
        """List of task_type values this agent can handle"""
        pass
    
    @property
    def output_tables(self) -> List[str]:
        """Tables this agent is allowed to write to"""
        return []
    
    def can_handle(self, task_type: str) -> bool:
        """Check if this agent can handle the given task type"""
        return task_type in self.supported_task_types
    
    @abstractmethod
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Execute the agent's logic for a given task.
        
        Args:
            task_payload: The task_payload from agent_tasks table
            
        Returns:
            TaskResult with success/failure and output data
            
        Rules:
        - Perform agent-specific logic
        - Return structured output
        - NEVER update task status directly
        - NEVER call other agents
        - Write ONLY to tables in output_tables
        """
        pass
    
    async def validate_payload(self, task_payload: Dict[str, Any]) -> Optional[str]:
        """
        Validate the task payload before execution.
        
        Returns:
            None if valid, error message if invalid
        """
        required_fields = ["user_id", "domain"]
        for field in required_fields:
            if field not in task_payload:
                return f"Missing required field: {field}"
        return None


# ============================================
# Stub Agent Workers (Placeholders)
# ============================================

class ResumeIntelligenceWorker(AgentWorker):
    """
    ResumeIntelligenceAgent - Analyzes resumes and extracts skills
    
    Output tables: resume_analysis, user_skills
    """
    
    @property
    def agent_name(self) -> str:
        return "ResumeIntelligenceAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return ["await_resume_upload", "await_cv_upload", "analyze_resume"]
    
    @property
    def output_tables(self) -> List[str]:
        return ["resume_analysis", "user_skills"]
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Stub implementation - actual logic to be added later
        """
        task_type = task_payload.get("task_type", "unknown")
        
        if task_type in ["await_resume_upload", "await_cv_upload"]:
            # Waiting state - no action needed
            return TaskResult(
                success=True,
                output={"status": "awaiting_upload"},
                summary="Waiting for resume/CV upload",
                tables_updated=[]
            )
        
        # Placeholder for actual resume analysis
        return TaskResult(
            success=True,
            output={"status": "stub_implementation"},
            summary="ResumeIntelligenceAgent stub executed",
            tables_updated=[]
        )


class RoadmapWorker(AgentWorker):
    """
    RoadmapAgent - Generates learning roadmaps
    
    Output tables: career_roadmap, roadmap_steps
    """
    
    @property
    def agent_name(self) -> str:
        return "RoadmapAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return [
            "generate_foundation_roadmap",
            "generate_exam_or_clinical_roadmap",
            "prepare_initial_plan",
            "refine_roadmap"
        ]
    
    @property
    def output_tables(self) -> List[str]:
        return ["career_roadmap", "roadmap_steps"]
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Stub implementation - actual logic to be added later
        """
        return TaskResult(
            success=True,
            output={"status": "stub_implementation"},
            summary="RoadmapAgent stub executed",
            tables_updated=[]
        )


class MentorWorker(AgentWorker):
    """
    MentorAgent - Provides guidance and answers questions
    
    Output tables: mentor_messages, guidance_history
    """
    
    @property
    def agent_name(self) -> str:
        return "MentorAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return [
            "welcome_guidance",
            "limited_domain_notice",
            "limited_mode_message",
            "answer_question",
            "provide_feedback"
        ]
    
    @property
    def output_tables(self) -> List[str]:
        return ["mentor_messages", "guidance_history"]
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Stub implementation - actual logic to be added later
        """
        task_type = task_payload.get("task_type", "unknown")
        
        if task_type in ["limited_domain_notice", "limited_mode_message"]:
            message = task_payload.get("message", "Your domain has limited support.")
            return TaskResult(
                success=True,
                output={
                    "message_type": "limited_mode",
                    "message": message
                },
                summary="Limited domain notice delivered",
                tables_updated=[]
            )
        
        return TaskResult(
            success=True,
            output={"status": "stub_implementation"},
            summary="MentorAgent stub executed",
            tables_updated=[]
        )
