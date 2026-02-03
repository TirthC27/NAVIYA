"""
MentorAgent - Guidance and Communication Agent

MentorAgent is responsible for:
- Welcoming users after onboarding
- Explaining what the system is doing
- Guiding users on next actions
- Handling limited-domain users gracefully

MentorAgent MUST NOT:
- Generate roadmaps
- Parse resumes
- Conduct interviews
- Assign tasks
- Override SupervisorAgent decisions
- Update user_context
- Modify agent_tasks

MentorAgent communicates ONLY via structured messages stored in mentor_messages table.
"""

import httpx
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.config import settings
from app.agents.worker_base import AgentWorker, TaskResult
from app.agents.llm import call_gemini


# ============================================
# Configuration
# ============================================

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
# Input/Output Schemas
# ============================================

class MessageType(str, Enum):
    WELCOME = "welcome"
    NOTICE = "notice"
    UPDATE = "update"


class DomainSupportStatus(str, Enum):
    SUPPORTED = "supported"
    LIMITED = "limited"


class ActionCTA(BaseModel):
    """Call-to-action for mentor messages"""
    label: str
    route: str


class MentorMessage(BaseModel):
    """Output schema for MentorAgent"""
    message_type: MessageType
    title: str
    body: str
    action_cta: Optional[ActionCTA] = None


class MentorTaskPayload(BaseModel):
    """Input schema for MentorAgent tasks"""
    user_id: str
    domain: str
    normalized_goal: Optional[Dict[str, Any]] = None
    current_phase: Optional[str] = None
    task_type: str
    domain_support_status: DomainSupportStatus = DomainSupportStatus.SUPPORTED
    # Optional context for updates
    completed_task: Optional[str] = None
    message: Optional[str] = None


# ============================================
# MentorAgent Prompts
# ============================================

WELCOME_GUIDANCE_SYSTEM_PROMPT = """You are a professional career guidance assistant for NAVIYA, an AI-powered career development platform.

Generate a welcome message for a user who just completed onboarding.

RULES:
- Be calm, reassuring, and professional
- Do NOT be overly enthusiastic or use hype language
- Do NOT promise specific outcomes or timelines
- Do NOT give study advice yet
- Do NOT mention AI, LLMs, agents, or backend processes
- Speak as the product, not as an AI assistant

The message must:
1. Acknowledge the user's stated career goal
2. Mention their selected domain (tech or medical)
3. Explain that the system is preparing their personalized experience
4. Clearly state what will happen next:
   - Resume/CV upload (optional but recommended)
   - Personalized roadmap preparation
   - Skill evaluation later

Output ONLY valid JSON in this exact format:
{
  "title": "Short welcome title (5-8 words)",
  "body": "Welcome message body (2-3 short paragraphs, no markdown, no emojis)"
}"""


LIMITED_DOMAIN_SYSTEM_PROMPT = """You are a professional career guidance assistant for NAVIYA, an AI-powered career development platform.

Generate a message for a user whose selected domain is not yet fully supported.

RULES:
- Be transparent but encouraging
- Do NOT reject the user or make them feel unwelcome
- Do NOT use the word "unsupported" or "not supported"
- Do NOT blame the user for their choice
- Do NOT mention technical limitations or AI

The message must:
1. Acknowledge their chosen domain respectfully
2. Clearly state that AI-powered features for this domain are under development
3. Reassure them that expansion is planned
4. Invite them to explore the platform's general features

Output ONLY valid JSON in this exact format:
{
  "title": "Short notice title (5-8 words)",
  "body": "Notice message body (2-3 short paragraphs, no markdown, no emojis)"
}"""


PROGRESS_UPDATE_SYSTEM_PROMPT = """You are a professional career guidance assistant for NAVIYA, an AI-powered career development platform.

Generate a brief progress update message.

RULES:
- Keep it short and clear
- No technical jargon
- No emojis or markdown
- Speak as the product, not as AI

Output ONLY valid JSON in this exact format:
{
  "title": "Short update title (3-6 words)",
  "body": "Brief update message (1-2 sentences)"
}"""


# ============================================
# MentorAgent Worker Class
# ============================================

class MentorAgentWorker(AgentWorker):
    """
    MentorAgent - Provides guidance and structured communication
    
    Handles task types:
    - welcome_guidance: Welcome message after onboarding (supported domain)
    - limited_domain_notice: Notice for limited domain users
    - system_progress_update: Updates on system progress
    
    Output tables: mentor_messages
    """
    
    SUPPORTED_TASK_TYPES = [
        "welcome_guidance",
        "limited_domain_notice",
        "system_progress_update"
    ]
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
    
    @property
    def agent_name(self) -> str:
        return "MentorAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return self.SUPPORTED_TASK_TYPES
    
    @property
    def output_tables(self) -> List[str]:
        return ["mentor_messages"]
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Execute MentorAgent logic.
        
        Args:
            task_payload: Must contain user_id, domain, task_type
            
        Returns:
            TaskResult with message output
        """
        start_time = datetime.now()
        
        try:
            # Parse and validate payload
            user_id = task_payload.get("user_id")
            task_type = task_payload.get("task_type")
            task_id = task_payload.get("task_id")  # For linking message to task
            
            if not user_id:
                return TaskResult(
                    success=False,
                    error="Missing required field: user_id",
                    summary="Validation failed"
                )
            
            # Validate task type
            if task_type not in self.SUPPORTED_TASK_TYPES:
                return TaskResult(
                    success=False,
                    error=f"Unknown task_type: {task_type}. Supported: {self.SUPPORTED_TASK_TYPES}",
                    summary=f"Unknown task type: {task_type}"
                )
            
            # Initialize HTTP client if not already done
            if not self.client:
                self.client = httpx.AsyncClient(timeout=30.0)
            
            # Fetch fresh user context (stateless requirement)
            user_context = await self._fetch_user_context(user_id)
            if not user_context:
                return TaskResult(
                    success=False,
                    error="User context not found",
                    summary="Failed to fetch user context"
                )
            
            # Validate onboarding completed
            if not user_context.get("onboarding_completed", False):
                return TaskResult(
                    success=False,
                    error="Onboarding not completed. MentorAgent cannot execute.",
                    summary="Onboarding incomplete"
                )
            
            # Determine domain support status
            domain = task_payload.get("domain", user_context.get("selected_domain", ""))
            domain_support = task_payload.get("domain_support_status", "supported")
            
            # Route to appropriate handler
            if task_type == "welcome_guidance":
                message = await self._handle_welcome_guidance(user_context, domain)
            elif task_type == "limited_domain_notice":
                message = await self._handle_limited_domain_notice(user_context, domain)
            elif task_type == "system_progress_update":
                completed_task = task_payload.get("completed_task", "")
                message = await self._handle_progress_update(user_context, completed_task)
            else:
                # Should not reach here due to earlier validation
                return TaskResult(
                    success=False,
                    error=f"Unhandled task_type: {task_type}",
                    summary="Task type not implemented"
                )
            
            # Save message to database
            saved = await self._save_message(user_id, task_id, message)
            
            if not saved:
                return TaskResult(
                    success=False,
                    error="Failed to save message to database",
                    summary="Database write failed"
                )
            
            # Calculate execution time
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return TaskResult(
                success=True,
                output={
                    "message_type": message.message_type.value,
                    "title": message.title,
                    "body": message.body,
                    "action_cta": message.action_cta.dict() if message.action_cta else None
                },
                summary=f"Generated {message.message_type.value} message: {message.title}",
                tables_updated=["mentor_messages"],
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            return TaskResult(
                success=False,
                error=str(e),
                summary=f"MentorAgent error: {str(e)}"
            )
    
    # ============================================
    # Data Access
    # ============================================
    
    async def _fetch_user_context(self, user_id: str) -> Optional[Dict]:
        """Fetch fresh user_context from database (stateless)"""
        url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=*"
        response = await self.client.get(url, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0]
        return None
    
    async def _save_message(
        self, 
        user_id: str, 
        task_id: Optional[str],
        message: MentorMessage
    ) -> bool:
        """Save mentor message to database"""
        url = f"{SUPABASE_REST_URL}/mentor_messages"
        
        payload = {
            "user_id": user_id,
            "message_type": message.message_type.value,
            "title": message.title,
            "body": message.body
        }
        
        if task_id:
            payload["task_id"] = task_id
        
        if message.action_cta:
            payload["action_cta"] = message.action_cta.dict()
        
        response = await self.client.post(url, headers=get_headers(), json=payload)
        
        if response.status_code in [200, 201]:
            print(f"✅ Saved mentor message: {message.title}")
            return True
        
        print(f"❌ Failed to save mentor message: {response.text}")
        return False
    
    # ============================================
    # Task Handlers
    # ============================================
    
    async def _handle_welcome_guidance(
        self, 
        user_context: Dict, 
        domain: str
    ) -> MentorMessage:
        """Generate welcome message for supported domain users"""
        
        career_goal = user_context.get("career_goal_raw", "career development")
        education = user_context.get("education_level", "")
        stage = user_context.get("current_stage", "")
        
        # Build prompt for LLM
        prompt = f"""Generate a welcome message for a new user.

User Information:
- Career Goal: {career_goal}
- Domain: {domain}
- Education Level: {education}
- Current Stage: {stage}

Remember:
- Acknowledge their specific goal
- Mention they're in the {domain.lower()} field
- Explain the system is preparing their experience
- List upcoming steps: resume upload, roadmap, skill evaluation"""

        try:
            # Call LLM
            response = await call_gemini(prompt, WELCOME_GUIDANCE_SYSTEM_PROMPT)
            
            # Parse JSON response
            parsed = self._parse_llm_response(response)
            
            return MentorMessage(
                message_type=MessageType.WELCOME,
                title=parsed.get("title", "Welcome to NAVIYA"),
                body=parsed.get("body", self._get_fallback_welcome_body(career_goal, domain)),
                action_cta=ActionCTA(
                    label="Complete Your Profile",
                    route="/dashboard"
                )
            )
        except Exception as e:
            print(f"⚠️ LLM call failed, using fallback: {e}")
            return MentorMessage(
                message_type=MessageType.WELCOME,
                title="Welcome to NAVIYA",
                body=self._get_fallback_welcome_body(career_goal, domain),
                action_cta=ActionCTA(
                    label="Complete Your Profile",
                    route="/dashboard"
                )
            )
    
    async def _handle_limited_domain_notice(
        self, 
        user_context: Dict, 
        domain: str
    ) -> MentorMessage:
        """Generate notice for limited domain users"""
        
        career_goal = user_context.get("career_goal_raw", "career development")
        
        prompt = f"""Generate a notice for a user whose domain is not yet fully supported.

User Information:
- Selected Domain: {domain}
- Career Goal: {career_goal}

Remember:
- Be respectful and encouraging
- Don't say "unsupported"
- Mention features are being developed
- Invite them to explore general features"""

        try:
            response = await call_gemini(prompt, LIMITED_DOMAIN_SYSTEM_PROMPT)
            parsed = self._parse_llm_response(response)
            
            return MentorMessage(
                message_type=MessageType.NOTICE,
                title=parsed.get("title", "Coming Soon to Your Field"),
                body=parsed.get("body", self._get_fallback_limited_body(domain)),
                action_cta=ActionCTA(
                    label="Explore Platform",
                    route="/dashboard"
                )
            )
        except Exception as e:
            print(f"⚠️ LLM call failed, using fallback: {e}")
            return MentorMessage(
                message_type=MessageType.NOTICE,
                title="Coming Soon to Your Field",
                body=self._get_fallback_limited_body(domain),
                action_cta=ActionCTA(
                    label="Explore Platform",
                    route="/dashboard"
                )
            )
    
    async def _handle_progress_update(
        self, 
        user_context: Dict, 
        completed_task: str
    ) -> MentorMessage:
        """Generate progress update message"""
        
        # Map task names to user-friendly descriptions
        task_messages = {
            "analyze_resume": {
                "title": "Resume Analysis Complete",
                "body": "We have finished analyzing your resume. Your skills and experience have been captured and will be used to personalize your learning roadmap."
            },
            "generate_foundation_roadmap": {
                "title": "Your Roadmap is Ready",
                "body": "Your personalized learning roadmap has been prepared. It includes carefully selected resources and milestones based on your goals and current skill level."
            },
            "prepare_initial_plan": {
                "title": "Initial Plan Ready",
                "body": "Your initial learning plan is now available. Review it to see your recommended first steps and upcoming milestones."
            },
            "skill_evaluation": {
                "title": "Skills Evaluated",
                "body": "Your skill assessment is complete. Check your dashboard to see your skill levels and areas for improvement."
            }
        }
        
        if completed_task in task_messages:
            msg = task_messages[completed_task]
            return MentorMessage(
                message_type=MessageType.UPDATE,
                title=msg["title"],
                body=msg["body"],
                action_cta=ActionCTA(
                    label="View Details",
                    route="/dashboard"
                )
            )
        
        # For unknown tasks, generate via LLM
        try:
            prompt = f"""Generate a brief progress update message.

Completed Task: {completed_task}

The message should inform the user that this step is complete."""

            response = await call_gemini(prompt, PROGRESS_UPDATE_SYSTEM_PROMPT)
            parsed = self._parse_llm_response(response)
            
            return MentorMessage(
                message_type=MessageType.UPDATE,
                title=parsed.get("title", "Progress Update"),
                body=parsed.get("body", f"A step in your journey has been completed: {completed_task}."),
                action_cta=ActionCTA(
                    label="View Dashboard",
                    route="/dashboard"
                )
            )
        except:
            return MentorMessage(
                message_type=MessageType.UPDATE,
                title="Progress Update",
                body=f"A step in your journey has been completed.",
                action_cta=ActionCTA(
                    label="View Dashboard",
                    route="/dashboard"
                )
            )
    
    # ============================================
    # Helper Methods
    # ============================================
    
    def _parse_llm_response(self, response: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks"""
        # Remove markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        return json.loads(cleaned)
    
    def _get_fallback_welcome_body(self, career_goal: str, domain: str) -> str:
        """Fallback welcome message when LLM fails"""
        return f"""We are glad to have you here. Your goal of {career_goal} in the {domain.lower()} field is an exciting journey to embark on.

Our system is now preparing your personalized experience. Here is what happens next: You will have the opportunity to upload your resume or CV to help us understand your background better. Then, we will prepare a customized learning roadmap tailored to your goals. Later, you will be able to assess your skills and track your progress.

Take your time to explore the platform while we set things up for you."""

    def _get_fallback_limited_body(self, domain: str) -> str:
        """Fallback limited domain message when LLM fails"""
        return f"""Thank you for your interest in pursuing a career in {domain}. We are actively expanding our AI-powered features to support more fields and career paths.

While full personalization for your domain is still being developed, you are welcome to explore the general features of our platform. We are working to bring the same depth of support to your field that we currently offer in technology and healthcare.

We appreciate your patience and will keep you updated as new features become available for your area of interest."""


# ============================================
# Factory Function
# ============================================

def create_mentor_agent() -> MentorAgentWorker:
    """Factory function to create MentorAgent instance"""
    return MentorAgentWorker()
