"""
Supervisor Agent

The orchestrator that decides which agent to invoke based on user intent.
Routes requests to the appropriate specialized agent.
"""

from typing import Any, Dict, List
from .base_agent import BaseAgent


class SupervisorAgent(BaseAgent):
    """
    The Supervisor Agent orchestrates the Career Intelligence system.
    
    Responsibilities:
    - Analyze user intent from their message/action
    - Route to the appropriate specialized agent
    - Aggregate responses when multiple agents are needed
    - Determine the "next best action" for the dashboard
    """
    
    agent_name = "SupervisorAgent"
    agent_description = "Orchestrates career intelligence by routing to specialized agents"
    
    # Available agents and their capabilities
    AGENT_CAPABILITIES = {
        "RoadmapAgent": [
            "career planning", "roadmap", "career path", "timeline",
            "milestones", "career goals", "phases", "career transition"
        ],
        "SkillExtractorAgent": [
            "resume", "extract skills", "parse resume", "skill extraction",
            "work experience", "analyze resume"
        ],
        "AssessmentAgent": [
            "assessment", "quiz", "test skills", "skill level",
            "evaluate", "knowledge test", "skill assessment"
        ],
        "InterviewAgent": [
            "interview", "mock interview", "interview prep", "practice interview",
            "interview questions", "behavioral interview", "technical interview"
        ],
        "MentorAgent": [
            "advice", "guidance", "mentor", "career advice", "help me",
            "what should I", "how do I", "tips", "suggestions"
        ]
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the user's intent and route to appropriate agent(s).
        
        Args:
            user_id: The user's ID
            context: Contains 'message' or 'action' to analyze
            
        Returns:
            Dict with routing decision and agent response
        """
        message = context.get("message", "")
        action = context.get("action", "")
        
        # Determine which agent to invoke
        target_agent = await self._determine_agent(message or action)
        
        # Log the routing decision
        await self.log_activity(
            user_id=user_id,
            action="route_request",
            input_summary=f"Message: {(message or action)[:100]}",
            output_summary=f"Routed to: {target_agent}",
            metadata={"target_agent": target_agent}
        )
        
        return {
            "target_agent": target_agent,
            "confidence": 0.85,
            "reasoning": f"Based on intent analysis, routing to {target_agent}"
        }
    
    async def _determine_agent(self, text: str) -> str:
        """
        Determine which agent should handle the request.
        Uses keyword matching first, falls back to LLM for ambiguous cases.
        """
        text_lower = text.lower()
        
        # Score each agent based on keyword matches
        scores = {}
        for agent, keywords in self.AGENT_CAPABILITIES.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[agent] = score
        
        # If we have a clear winner, return it
        if scores:
            return max(scores, key=scores.get)
        
        # Default to MentorAgent for general queries
        return "MentorAgent"
    
    async def get_next_best_action(self, user_id: str) -> Dict[str, Any]:
        """
        Determine the next best action for the user based on their profile.
        This powers the dashboard "Next Best Action" card.
        
        Returns:
            Dict with action details and reasoning
        """
        # Gather user context
        profile = await self.get_user_profile(user_id)
        skills = await self.get_user_skills(user_id)
        roadmap = await self.get_user_roadmap(user_id)
        assessments = await self.get_assessment_results(user_id)
        
        # Determine next action based on context
        if not profile:
            return {
                "action": "complete_profile",
                "title": "Complete Your Career Profile",
                "description": "Set up your career goals and preferences to get personalized guidance",
                "priority": "high",
                "agent": "SupervisorAgent"
            }
        
        if not skills:
            return {
                "action": "upload_resume",
                "title": "Upload Your Resume",
                "description": "Let us analyze your experience and extract your skills",
                "priority": "high",
                "agent": "SkillExtractorAgent"
            }
        
        if not roadmap:
            return {
                "action": "generate_roadmap",
                "title": "Generate Your Career Roadmap",
                "description": "Create a personalized path to your career goals",
                "priority": "high",
                "agent": "RoadmapAgent"
            }
        
        # Check for skills that need assessment
        unassessed_skills = [s for s in skills if not s.get("verified")]
        if unassessed_skills:
            skill = unassessed_skills[0]
            return {
                "action": "take_assessment",
                "title": f"Assess Your {skill['skill_name']} Skills",
                "description": "Verify your skill level with a quick assessment",
                "priority": "medium",
                "agent": "AssessmentAgent",
                "skill_id": skill["id"]
            }
        
        # Check roadmap progress
        if roadmap and roadmap.get("phases"):
            phases = roadmap["phases"]
            current_phase = next(
                (p for p in phases if p.get("status") == "in_progress"),
                None
            )
            if current_phase:
                return {
                    "action": "continue_roadmap",
                    "title": f"Continue: {current_phase.get('name', 'Current Phase')}",
                    "description": current_phase.get("description", "Keep progressing on your career path"),
                    "priority": "medium",
                    "agent": "RoadmapAgent",
                    "phase_id": current_phase.get("id")
                }
        
        # Default: suggest mock interview
        return {
            "action": "mock_interview",
            "title": "Practice with a Mock Interview",
            "description": "Stay sharp with interview practice",
            "priority": "low",
            "agent": "InterviewAgent"
        }
    
    async def get_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """
        Aggregate data for the career dashboard.
        
        Returns comprehensive dashboard data including:
        - Profile summary
        - Skills count and breakdown
        - Roadmap progress
        - Recent activity
        - Next best action
        """
        profile = await self.get_user_profile(user_id)
        skills = await self.get_user_skills(user_id)
        roadmap = await self.get_user_roadmap(user_id)
        assessments = await self.get_assessment_results(user_id)
        next_action = await self.get_next_best_action(user_id)
        
        # Calculate stats
        skills_by_level = {}
        for skill in skills:
            level = skill.get("skill_level", "unknown")
            skills_by_level[level] = skills_by_level.get(level, 0) + 1
        
        # Calculate roadmap progress
        roadmap_progress = 0
        current_phase = None
        if roadmap and roadmap.get("phases"):
            completed = sum(1 for p in roadmap["phases"] if p.get("status") == "completed")
            roadmap_progress = int((completed / len(roadmap["phases"])) * 100)
            current_phase = next(
                (p["name"] for p in roadmap["phases"] if p.get("status") == "in_progress"),
                "Not Started"
            )
        
        # Get recent activity
        activity = await self._get_recent_activity(user_id)
        
        return {
            "profile": profile,
            "stats": {
                "total_skills": len(skills),
                "skills_by_level": skills_by_level,
                "roadmap_progress": roadmap_progress,
                "current_phase": current_phase,
                "assessments_completed": len(assessments),
                "career_readiness": self._calculate_readiness(profile, skills, roadmap, assessments)
            },
            "next_action": next_action,
            "recent_activity": activity
        }
    
    def _calculate_readiness(
        self,
        profile: Dict,
        skills: List,
        roadmap: Dict,
        assessments: List
    ) -> int:
        """Calculate overall career readiness score (0-100)."""
        score = 0
        
        if profile:
            score += 20
        if skills:
            score += min(20, len(skills) * 2)
        if roadmap:
            score += 20
            if roadmap.get("phases"):
                completed = sum(1 for p in roadmap["phases"] if p.get("status") == "completed")
                score += min(20, completed * 5)
        if assessments:
            avg_score = sum(a.get("score", 0) for a in assessments) / len(assessments)
            score += min(20, int(avg_score * 0.2))
        
        return min(100, score)
    
    async def _get_recent_activity(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Get recent agent activity for the user."""
        try:
            result = self.supabase.table("agent_activity_log")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return result.data or []
        except Exception:
            return []
