"""
Mentor Agent

Provides conversational career guidance and advice.
Has access to all user data for personalized recommendations.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import uuid
import re

from .base_agent import BaseAgent


class MentorAgent(BaseAgent):
    """
    The Mentor Agent provides conversational career guidance.
    
    Responsibilities:
    - Answer career-related questions
    - Provide personalized advice based on user context
    - Reference roadmap, skills, and assessments
    - Suggest next steps and actions
    - Maintain conversation context within sessions
    """
    
    agent_name = "MentorAgent"
    agent_description = "Provides personalized career guidance and mentorship"
    
    # Topic categories for better response routing
    TOPIC_CATEGORIES = {
        "career_planning": ["career", "path", "future", "goal", "direction"],
        "skill_development": ["skill", "learn", "improve", "develop", "course"],
        "job_search": ["job", "apply", "resume", "cover letter", "application"],
        "interview_prep": ["interview", "prepare", "question", "answer"],
        "salary_negotiation": ["salary", "negotiate", "compensation", "offer"],
        "workplace": ["workplace", "team", "manager", "colleague", "culture"],
        "networking": ["network", "connect", "linkedin", "meetup", "conference"]
    }
    
    async def execute(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle mentor conversation.
        
        Args:
            user_id: The user's ID
            context: Contains message, session_id, etc.
            
        Returns:
            Dict with mentor response
        """
        action = context.get("action", "chat")
        
        if action == "chat":
            return await self._handle_chat(user_id, context)
        elif action == "get_suggestion":
            return await self._get_next_suggestion(user_id)
        elif action == "start_session":
            return await self._start_session(user_id)
        elif action == "get_sessions":
            return await self._get_sessions(user_id)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _handle_chat(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a chat message from the user."""
        message = context.get("message", "")
        session_id = context.get("session_id")
        
        if not message:
            return {"error": "No message provided"}
        
        # Gather user context for personalization
        user_context = await self._gather_user_context(user_id)
        
        # Detect topic category
        topic = self._detect_topic(message)
        
        # Build the prompt with context
        prompt = self._build_chat_prompt(message, user_context, topic)
        
        # Generate response
        response = await self.call_llm(
            prompt=prompt,
            system_prompt=self._get_mentor_system_prompt(user_context),
            temperature=0.7,
            max_tokens=1000
        )
        
        # Save to session if exists
        if session_id:
            await self._save_to_session(session_id, message, response)
        
        # Log activity
        await self.log_activity(
            user_id=user_id,
            action="mentor_chat",
            input_summary=f"Topic: {topic}, Message: {message[:50]}...",
            output_summary=f"Response generated ({len(response)} chars)",
            metadata={"topic": topic, "session_id": session_id}
        )
        
        return {
            "response": response,
            "topic": topic,
            "session_id": session_id,
            "suggested_actions": self._get_suggested_actions(topic, user_context)
        }
    
    async def _gather_user_context(self, user_id: str) -> Dict[str, Any]:
        """Gather all relevant user context."""
        profile = await self.get_user_profile(user_id)
        skills = await self.get_user_skills(user_id)
        roadmap = await self.get_user_roadmap(user_id)
        assessments = await self.get_assessment_results(user_id)
        
        # Build context summary
        context = {
            "has_profile": bool(profile),
            "target_role": profile.get("target_role", "Not set") if profile else "Not set",
            "experience_level": profile.get("experience_level", "Unknown") if profile else "Unknown",
            "timeline_months": profile.get("timeline_months", 12) if profile else 12,
            "skill_count": len(skills),
            "top_skills": [s.get("skill_name") for s in skills[:5]] if skills else [],
            "has_roadmap": bool(roadmap),
            "current_phase": None,
            "roadmap_progress": 0,
            "assessment_count": len(assessments),
            "average_score": 0
        }
        
        # Add roadmap details
        if roadmap:
            phases = roadmap.get("phases", [])
            current = next((p for p in phases if p.get("status") == "in_progress"), None)
            if current:
                context["current_phase"] = current.get("name")
            context["roadmap_progress"] = roadmap.get("overall_progress", 0)
        
        # Add assessment average
        if assessments:
            scores = [a.get("score", 0) for a in assessments]
            context["average_score"] = sum(scores) / len(scores)
        
        return context
    
    def _detect_topic(self, message: str) -> str:
        """Detect the topic category of the message."""
        message_lower = message.lower()
        
        for category, keywords in self.TOPIC_CATEGORIES.items():
            if any(kw in message_lower for kw in keywords):
                return category
        
        return "general"
    
    def _build_chat_prompt(
        self, 
        message: str, 
        user_context: Dict, 
        topic: str
    ) -> str:
        """Build the prompt for the chat response."""
        context_summary = f"""
USER CONTEXT:
- Target Role: {user_context.get('target_role')}
- Experience Level: {user_context.get('experience_level')}
- Timeline: {user_context.get('timeline_months')} months
- Skills: {', '.join(user_context.get('top_skills', [])) or 'None recorded'}
- Roadmap Progress: {user_context.get('roadmap_progress', 0):.0f}%
- Current Phase: {user_context.get('current_phase') or 'Not started'}
- Assessments Completed: {user_context.get('assessment_count')}
- Average Assessment Score: {user_context.get('average_score', 0):.0f}%
"""
        
        return f"""{context_summary}

USER MESSAGE: {message}

Provide helpful, personalized career guidance based on the user's context and question.
Be specific and actionable. Reference their actual progress and goals when relevant."""
    
    def _get_mentor_system_prompt(self, user_context: Dict) -> str:
        """Get the system prompt for mentor responses."""
        return f"""You are an experienced, supportive career mentor helping someone become a {user_context.get('target_role', 'professional')}.

Your mentoring style:
- Warm and encouraging, but also direct and practical
- Focus on actionable advice
- Reference the user's specific situation (skills, roadmap progress, assessments)
- Suggest concrete next steps
- Share relevant industry insights
- Ask clarifying questions when helpful

Important:
- Keep responses concise but thorough (2-4 paragraphs typically)
- Use bullet points for lists
- Be encouraging but realistic
- If you don't have enough context, ask for clarification
- Recommend using the platform's features (assessments, roadmap, interviews) when relevant"""
    
    def _get_suggested_actions(self, topic: str, user_context: Dict) -> List[Dict]:
        """Get suggested actions based on topic and context."""
        actions = []
        
        if topic == "skill_development":
            if user_context.get("skill_count", 0) == 0:
                actions.append({
                    "action": "upload_resume",
                    "label": "Upload your resume to identify skills",
                    "route": "/career/resume"
                })
            else:
                actions.append({
                    "action": "take_assessment",
                    "label": "Take a skill assessment",
                    "route": "/career/skills"
                })
        
        elif topic == "interview_prep":
            actions.append({
                "action": "mock_interview",
                "label": "Practice with a mock interview",
                "route": "/career/interview"
            })
        
        elif topic == "career_planning" and not user_context.get("has_roadmap"):
            actions.append({
                "action": "create_roadmap",
                "label": "Create your career roadmap",
                "route": "/career/roadmap"
            })
        
        elif topic == "job_search":
            actions.append({
                "action": "review_resume",
                "label": "Review resume analysis",
                "route": "/career/resume"
            })
        
        return actions
    
    async def _get_next_suggestion(self, user_id: str) -> Dict[str, Any]:
        """Get the next suggested action for the user."""
        user_context = await self._gather_user_context(user_id)
        
        # Priority-based suggestions
        if not user_context.get("has_profile"):
            return {
                "suggestion": "Complete your career profile to get personalized guidance.",
                "action": "complete_profile",
                "route": "/career/dashboard"
            }
        
        if user_context.get("skill_count", 0) == 0:
            return {
                "suggestion": "Upload your resume to identify your skills and get role recommendations.",
                "action": "upload_resume",
                "route": "/career/resume"
            }
        
        if not user_context.get("has_roadmap"):
            return {
                "suggestion": f"Create a roadmap to {user_context.get('target_role')} with clear phases and milestones.",
                "action": "create_roadmap",
                "route": "/career/roadmap"
            }
        
        if user_context.get("roadmap_progress", 0) < 50:
            return {
                "suggestion": f"Continue working on your roadmap. Current progress: {user_context.get('roadmap_progress', 0):.0f}%",
                "action": "continue_roadmap",
                "route": "/career/roadmap"
            }
        
        if user_context.get("assessment_count", 0) < 3:
            return {
                "suggestion": "Take more skill assessments to verify your knowledge and earn XP.",
                "action": "take_assessment",
                "route": "/career/skills"
            }
        
        return {
            "suggestion": "Practice with a mock interview to prepare for real opportunities.",
            "action": "mock_interview",
            "route": "/career/interview"
        }
    
    async def _start_session(self, user_id: str) -> Dict[str, Any]:
        """Start a new mentor session."""
        session_id = str(uuid.uuid4())
        
        try:
            self.supabase.table("mentor_sessions").insert({
                "id": session_id,
                "user_id": user_id,
                "messages": [],
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to create session: {e}")
        
        # Generate welcome message
        user_context = await self._gather_user_context(user_id)
        welcome = self._generate_welcome_message(user_context)
        
        return {
            "session_id": session_id,
            "welcome_message": welcome,
            "user_context_summary": {
                "target_role": user_context.get("target_role"),
                "progress": user_context.get("roadmap_progress", 0)
            }
        }
    
    def _generate_welcome_message(self, user_context: Dict) -> str:
        """Generate a personalized welcome message."""
        target_role = user_context.get("target_role", "your career goals")
        progress = user_context.get("roadmap_progress", 0)
        
        if progress > 0:
            return f"Welcome back! I see you're {progress:.0f}% through your journey to becoming a {target_role}. How can I help you today?"
        else:
            return f"Hello! I'm your AI Career Mentor. I'm here to help you on your path to becoming a {target_role}. What would you like to discuss?"
    
    async def _save_to_session(
        self, 
        session_id: str, 
        user_message: str, 
        assistant_response: str
    ) -> None:
        """Save messages to the session."""
        try:
            # Get current messages
            result = self.supabase.table("mentor_sessions")\
                .select("messages")\
                .eq("id", session_id)\
                .single()\
                .execute()
            
            messages = result.data.get("messages", []) if result.data else []
            
            # Add new messages
            messages.append({
                "role": "user",
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            })
            messages.append({
                "role": "assistant",
                "content": assistant_response,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Update session
            self.supabase.table("mentor_sessions")\
                .update({
                    "messages": messages,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", session_id)\
                .execute()
        except Exception as e:
            print(f"Failed to save to session: {e}")
    
    async def _get_sessions(self, user_id: str) -> Dict[str, Any]:
        """Get user's mentor sessions."""
        try:
            result = self.supabase.table("mentor_sessions")\
                .select("id, created_at, updated_at")\
                .eq("user_id", user_id)\
                .order("updated_at", desc=True)\
                .limit(10)\
                .execute()
            
            return {"sessions": result.data or []}
        except Exception:
            return {"sessions": []}
