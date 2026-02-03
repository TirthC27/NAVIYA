"""
Roadmap Agent

Generates and manages personalized career roadmaps.
Creates phased timelines with milestones, skills, and projects.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import json
import uuid

from .base_agent import BaseAgent


class RoadmapAgent(BaseAgent):
    """
    The Roadmap Agent creates personalized career development plans.
    
    Responsibilities:
    - Generate multi-phase career roadmaps
    - Define milestones and exit criteria
    - Map required skills to each phase
    - Suggest projects and learning resources
    - Track and update progress
    """
    
    agent_name = "RoadmapAgent"
    agent_description = "Creates personalized career roadmaps with phased timelines and milestones"
    
    PHASE_TEMPLATES = {
        "foundation": {
            "name": "Foundation Building",
            "duration_weeks": 8,
            "focus": "Core fundamentals and basic concepts"
        },
        "intermediate": {
            "name": "Skill Development",
            "duration_weeks": 12,
            "focus": "Building practical experience"
        },
        "advanced": {
            "name": "Advanced Mastery",
            "duration_weeks": 12,
            "focus": "Complex projects and specialization"
        },
        "career_prep": {
            "name": "Career Launch",
            "duration_weeks": 4,
            "focus": "Interview prep and job search"
        }
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate or update a career roadmap.
        
        Args:
            user_id: The user's ID
            context: Contains target_role, timeline, current_skills, etc.
            
        Returns:
            Dict with the generated roadmap
        """
        action = context.get("action", "generate")
        
        if action == "generate":
            return await self._generate_roadmap(user_id, context)
        elif action == "update_progress":
            return await self._update_progress(user_id, context)
        elif action == "get_current":
            return await self._get_current_roadmap(user_id)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _generate_roadmap(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a new career roadmap."""
        target_role = context.get("target_role", "Software Developer")
        timeline_months = context.get("timeline_months", 12)
        current_skills = context.get("current_skills", [])
        experience_level = context.get("experience_level", "beginner")
        
        # Fetch additional context
        profile = await self.get_user_profile(user_id)
        skills = await self.get_user_skills(user_id)
        
        # Build the prompt for LLM
        prompt = self._build_roadmap_prompt(
            target_role=target_role,
            timeline_months=timeline_months,
            current_skills=skills or current_skills,
            experience_level=experience_level,
            profile=profile
        )
        
        # Generate roadmap with LLM
        response = await self.call_llm(
            prompt=prompt,
            system_prompt=self._get_roadmap_system_prompt(),
            temperature=0.7
        )
        
        # Parse the LLM response
        roadmap = self._parse_roadmap_response(response, target_role, timeline_months)
        
        # Save to Supabase
        roadmap_id = await self._save_roadmap(user_id, roadmap)
        roadmap["id"] = roadmap_id
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="generate_roadmap",
            input_summary=f"Target: {target_role}, Timeline: {timeline_months} months",
            output_summary=f"Generated {len(roadmap.get('phases', []))} phase roadmap",
            metadata={"roadmap_id": roadmap_id}
        )
        
        return roadmap
    
    def _build_roadmap_prompt(
        self,
        target_role: str,
        timeline_months: int,
        current_skills: List,
        experience_level: str,
        profile: Optional[Dict]
    ) -> str:
        """Build the prompt for roadmap generation."""
        skills_text = ", ".join([
            s.get("skill_name", s) if isinstance(s, dict) else s 
            for s in current_skills[:10]
        ]) if current_skills else "None specified"
        
        return f"""Create a detailed career roadmap for someone targeting the role of "{target_role}".

Current Situation:
- Experience Level: {experience_level}
- Current Skills: {skills_text}
- Timeline: {timeline_months} months
- Target Role: {target_role}

Generate a phased roadmap with:
1. 3-4 distinct phases
2. Each phase should have:
   - Name and description
   - Duration in weeks
   - Key skills to develop
   - 2-3 practical projects
   - Exit criteria (what they should be able to do)
3. Consider the timeline constraint
4. Build progressively on existing skills

Respond in JSON format with this structure:
{{
    "phases": [
        {{
            "name": "Phase Name",
            "description": "What this phase covers",
            "duration_weeks": 8,
            "skills": ["skill1", "skill2"],
            "projects": [
                {{"name": "Project Name", "description": "Brief description"}}
            ],
            "exit_criteria": ["Criteria 1", "Criteria 2"],
            "resources": ["Resource 1", "Resource 2"]
        }}
    ],
    "summary": "Brief roadmap summary"
}}"""
    
    def _get_roadmap_system_prompt(self) -> str:
        """Get the system prompt for roadmap generation."""
        return """You are an expert career coach and curriculum designer. 
You create practical, achievable career development roadmaps.
Your roadmaps are:
- Realistic and time-bound
- Progressive (each phase builds on the previous)
- Practical (focused on real projects and skills)
- Industry-aligned (based on actual job requirements)

Always respond with valid JSON that can be parsed."""
    
    def _parse_roadmap_response(
        self,
        response: str,
        target_role: str,
        timeline_months: int
    ) -> Dict[str, Any]:
        """Parse the LLM response into a roadmap structure."""
        try:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                roadmap_data = json.loads(json_match.group())
            else:
                # Fallback to default structure
                roadmap_data = self._get_default_roadmap(target_role, timeline_months)
        except json.JSONDecodeError:
            roadmap_data = self._get_default_roadmap(target_role, timeline_months)
        
        # Add metadata
        roadmap_data["target_role"] = target_role
        roadmap_data["timeline_months"] = timeline_months
        roadmap_data["created_at"] = datetime.utcnow().isoformat()
        
        # Add IDs and status to phases
        for i, phase in enumerate(roadmap_data.get("phases", [])):
            phase["id"] = str(uuid.uuid4())
            phase["order"] = i + 1
            phase["status"] = "not_started" if i > 0 else "in_progress"
            phase["progress"] = 0
        
        return roadmap_data
    
    def _get_default_roadmap(self, target_role: str, timeline_months: int) -> Dict:
        """Get a default roadmap structure when LLM parsing fails."""
        return {
            "phases": [
                {
                    "name": "Foundation Building",
                    "description": "Build core fundamentals and understanding",
                    "duration_weeks": 8,
                    "skills": ["Core concepts", "Basic tools"],
                    "projects": [{"name": "Starter Project", "description": "Apply basic concepts"}],
                    "exit_criteria": ["Understand fundamentals"],
                    "resources": []
                },
                {
                    "name": "Skill Development",
                    "description": "Develop practical skills through projects",
                    "duration_weeks": 12,
                    "skills": ["Intermediate concepts", "Best practices"],
                    "projects": [{"name": "Portfolio Project", "description": "Build something meaningful"}],
                    "exit_criteria": ["Complete a substantial project"],
                    "resources": []
                },
                {
                    "name": "Career Launch",
                    "description": "Prepare for job applications and interviews",
                    "duration_weeks": 4,
                    "skills": ["Interview skills", "Job search"],
                    "projects": [{"name": "Polish Portfolio", "description": "Finalize your portfolio"}],
                    "exit_criteria": ["Ready for interviews"],
                    "resources": []
                }
            ],
            "summary": f"A {timeline_months}-month roadmap to become a {target_role}"
        }
    
    async def _save_roadmap(self, user_id: str, roadmap: Dict) -> str:
        """Save the roadmap to Supabase."""
        roadmap_id = str(uuid.uuid4())
        
        try:
            self.supabase.table("career_roadmap").insert({
                "id": roadmap_id,
                "user_id": user_id,
                "target_role": roadmap.get("target_role"),
                "timeline_months": roadmap.get("timeline_months"),
                "phases": roadmap.get("phases", []),
                "current_phase": 1,
                "overall_progress": 0,
                "status": "active",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to save roadmap: {e}")
        
        return roadmap_id
    
    async def _update_progress(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Update progress on the current roadmap."""
        roadmap_id = context.get("roadmap_id")
        phase_id = context.get("phase_id")
        progress = context.get("progress", 0)
        completed = context.get("completed", False)
        
        roadmap = await self.get_user_roadmap(user_id)
        if not roadmap:
            return {"error": "No active roadmap found"}
        
        # Update phase progress
        phases = roadmap.get("phases", [])
        for phase in phases:
            if phase.get("id") == phase_id:
                phase["progress"] = progress
                if completed:
                    phase["status"] = "completed"
                    # Start next phase
                    next_idx = phases.index(phase) + 1
                    if next_idx < len(phases):
                        phases[next_idx]["status"] = "in_progress"
                break
        
        # Calculate overall progress
        overall = sum(p.get("progress", 0) for p in phases) / len(phases) if phases else 0
        
        # Update in Supabase
        try:
            self.supabase.table("career_roadmap")\
                .update({
                    "phases": phases,
                    "overall_progress": overall,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", roadmap.get("id"))\
                .execute()
        except Exception as e:
            return {"error": f"Failed to update: {e}"}
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="update_roadmap_progress",
            input_summary=f"Phase: {phase_id}, Progress: {progress}%",
            output_summary=f"Overall progress: {overall:.1f}%",
            metadata={"roadmap_id": roadmap.get("id")}
        )
        
        return {
            "success": True,
            "overall_progress": overall,
            "phases": phases
        }
    
    async def _get_current_roadmap(self, user_id: str) -> Dict[str, Any]:
        """Get the user's current roadmap."""
        roadmap = await self.get_user_roadmap(user_id)
        if roadmap:
            return roadmap
        return {"error": "No roadmap found", "has_roadmap": False}
