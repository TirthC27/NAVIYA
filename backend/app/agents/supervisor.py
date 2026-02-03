"""
SupervisorAgent - Central Orchestrator for Multi-Agent System

This agent:
- Reads onboarding data from user_context
- Validates domain support
- Normalizes user intent
- Decides which agents should work
- Creates tasks for other agents

It MUST NOT:
- Generate roadmaps
- Parse resumes
- Answer user questions
- Directly call other agents
- Access frontend state
"""

import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.config import settings
from app.agents.llm import call_gemini


# ============================================
# Configuration
# ============================================

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

# Supported domains (V1)
SUPPORTED_DOMAINS = [
    "Technology / Engineering",
    "Medical / Healthcare"
]


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

class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class NormalizedGoal(BaseModel):
    """Normalized career goal structure"""
    primary_track: str
    confidence: Confidence


class UserContext(BaseModel):
    """Input schema for SupervisorAgent - from user_context table"""
    user_id: str
    selected_domain: Optional[str] = None
    career_goal_raw: Optional[str] = None
    education_level: Optional[str] = None
    current_stage: Optional[str] = None
    self_assessed_level: Optional[str] = None
    weekly_hours: Optional[int] = 10
    primary_blocker: Optional[str] = None
    onboarding_completed: bool = False
    supervisor_initialized: bool = False
    normalized_goal: Optional[Dict] = None
    current_phase: Optional[str] = None


class TaskPayload(BaseModel):
    """Standard task payload schema"""
    user_id: str
    domain: str
    normalized_goal: Dict
    current_phase: str


class AgentTask(BaseModel):
    """Agent task to be created"""
    user_id: str
    agent_name: str
    task_type: str
    task_payload: Dict
    status: str = "pending"


class SupervisorResult(BaseModel):
    """Result from SupervisorAgent execution"""
    success: bool
    user_id: str
    domain_supported: bool
    limited_mode: bool = False
    normalized_goal: Optional[NormalizedGoal] = None
    current_phase: str = "exploration"
    tasks_created: List[str] = []
    error: Optional[str] = None


# ============================================
# Core SupervisorAgent Class
# ============================================

class SupervisorAgent:
    """
    Central orchestrator for the multi-agent system.
    Reads user context, validates, normalizes, and creates tasks.
    """
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
        
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def run(self, user_id: str) -> SupervisorResult:
        """
        Main entry point for SupervisorAgent.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            SupervisorResult with execution details
        """
        print(f"\n{'='*50}")
        print(f"🎯 SupervisorAgent starting for user: {user_id}")
        print(f"{'='*50}")
        
        try:
            # Step 1: Fetch user context
            user_context = await self._fetch_user_context(user_id)
            if not user_context:
                return SupervisorResult(
                    success=False,
                    user_id=user_id,
                    domain_supported=False,
                    error="User context not found"
                )
            
            # Step 2: Validate preconditions
            validation_error = self._validate_preconditions(user_context)
            if validation_error:
                print(f"⚠️ Validation failed: {validation_error}")
                return SupervisorResult(
                    success=False,
                    user_id=user_id,
                    domain_supported=False,
                    error=validation_error
                )
            
            # Step 3: Check for existing tasks (idempotency)
            existing_tasks = await self._check_existing_tasks(user_id)
            if existing_tasks:
                print(f"⚠️ Tasks already exist for user, skipping creation")
                return SupervisorResult(
                    success=True,
                    user_id=user_id,
                    domain_supported=True,
                    error="Tasks already exist - idempotent skip"
                )
            
            # Step 4: Domain gating
            domain = user_context.get("selected_domain", "")
            is_supported = domain in SUPPORTED_DOMAINS
            
            if not is_supported:
                print(f"⚠️ Unsupported domain: {domain}")
                return await self._handle_limited_mode(user_id, domain, user_context)
            
            print(f"✅ Domain supported: {domain}")
            
            # Step 5: Normalize career goal
            career_goal_raw = user_context.get("career_goal_raw", "")
            normalized_goal = await self._normalize_goal(career_goal_raw, domain)
            print(f"✅ Normalized goal: {normalized_goal.primary_track} ({normalized_goal.confidence})")
            
            # Step 6: Assign initial phase
            current_phase = "exploration"
            
            # Step 7: Update user context with normalized data
            await self._update_user_context(
                user_id,
                normalized_goal=normalized_goal.dict(),
                current_phase=current_phase
            )
            
            # Step 8: Create tasks based on domain
            tasks_created = await self._create_domain_tasks(
                user_id, domain, normalized_goal.dict(), current_phase
            )
            
            # Step 9: Mark supervisor as initialized
            await self._mark_supervisor_initialized(user_id)
            
            print(f"\n✅ SupervisorAgent completed successfully")
            print(f"   Tasks created: {len(tasks_created)}")
            
            return SupervisorResult(
                success=True,
                user_id=user_id,
                domain_supported=True,
                limited_mode=False,
                normalized_goal=normalized_goal,
                current_phase=current_phase,
                tasks_created=tasks_created
            )
            
        except Exception as e:
            print(f"❌ SupervisorAgent error: {str(e)}")
            await self._log_error(user_id, str(e))
            return SupervisorResult(
                success=False,
                user_id=user_id,
                domain_supported=False,
                error=str(e)
            )
    
    # ============================================
    # Data Fetching
    # ============================================
    
    async def _fetch_user_context(self, user_id: str) -> Optional[Dict]:
        """Fetch user_context row from Supabase"""
        url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=*"
        response = await self.client.get(url, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                print(f"✅ Fetched user context")
                return data[0]
        
        print(f"❌ Failed to fetch user context: {response.text}")
        return None
    
    async def _check_existing_tasks(self, user_id: str) -> bool:
        """Check if tasks already exist for this user"""
        url = f"{SUPABASE_REST_URL}/agent_tasks?user_id=eq.{user_id}&select=id&limit=1"
        response = await self.client.get(url, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            return len(data) > 0
        return False
    
    # ============================================
    # Validation
    # ============================================
    
    def _validate_preconditions(self, user_context: Dict) -> Optional[str]:
        """
        Validate that SupervisorAgent can run.
        
        Returns error message if validation fails, None if valid.
        """
        # Check onboarding completed
        if not user_context.get("onboarding_completed", False):
            return "Onboarding not completed"
        
        # Check supervisor not already initialized
        if user_context.get("supervisor_initialized", False):
            return "Supervisor already initialized"
        
        # Check required fields
        if not user_context.get("selected_domain"):
            return "Missing selected_domain"
        
        if not user_context.get("career_goal_raw"):
            return "Missing career_goal_raw"
        
        return None
    
    # ============================================
    # Domain Gating & Limited Mode
    # ============================================
    
    async def _handle_limited_mode(
        self, 
        user_id: str, 
        domain: str,
        user_context: Dict
    ) -> SupervisorResult:
        """Handle unsupported domain - create limited mode task only"""
        print(f"🔒 Entering limited mode for domain: {domain}")
        
        # Create minimal normalized goal
        normalized_goal = NormalizedGoal(
            primary_track="unsupported_domain",
            confidence=Confidence.LOW
        )
        
        # Update user context
        await self._update_user_context(
            user_id,
            normalized_goal=normalized_goal.dict(),
            current_phase="limited"
        )
        
        # Create ONLY MentorAgent task for limited mode
        task_payload = {
            "user_id": user_id,
            "domain": domain,
            "normalized_goal": normalized_goal.dict(),
            "current_phase": "limited",
            "message": f"Domain '{domain}' is not fully supported yet. Providing guidance only."
        }
        
        task = AgentTask(
            user_id=user_id,
            agent_name="MentorAgent",
            task_type="limited_domain_notice",
            task_payload=task_payload
        )
        
        await self._insert_task(task)
        await self._mark_supervisor_initialized(user_id)
        
        print(f"✅ Limited mode task created")
        
        return SupervisorResult(
            success=True,
            user_id=user_id,
            domain_supported=False,
            limited_mode=True,
            normalized_goal=normalized_goal,
            current_phase="limited",
            tasks_created=["MentorAgent:limited_domain_notice"]
        )
    
    # ============================================
    # Goal Normalization
    # ============================================
    
    async def _normalize_goal(self, career_goal_raw: str, domain: str) -> NormalizedGoal:
        """
        Normalize career_goal_raw into structured format.
        Uses LLM for intelligent parsing but keeps it minimal.
        """
        if not career_goal_raw:
            return NormalizedGoal(
                primary_track="general",
                confidence=Confidence.LOW
            )
        
        # Define domain-specific track mappings
        track_mappings = {
            "Technology / Engineering": {
                "software engineer": "software_engineering",
                "web developer": "web_development",
                "data scientist": "data_science",
                "machine learning": "machine_learning",
                "devops": "devops",
                "mobile developer": "mobile_development",
                "frontend": "frontend_development",
                "backend": "backend_development",
                "full stack": "fullstack_development",
                "cloud": "cloud_engineering",
                "cybersecurity": "cybersecurity",
                "ai": "artificial_intelligence",
            },
            "Medical / Healthcare": {
                "neet": "neet_preparation",
                "neet pg": "neet_pg",
                "usmle": "usmle_preparation",
                "doctor": "medical_practice",
                "surgeon": "surgery",
                "research": "medical_research",
                "clinical": "clinical_practice",
                "nursing": "nursing",
                "pharmacist": "pharmacy",
            }
        }
        
        # Try simple keyword matching first
        goal_lower = career_goal_raw.lower()
        domain_tracks = track_mappings.get(domain, {})
        
        for keyword, track in domain_tracks.items():
            if keyword in goal_lower:
                return NormalizedGoal(
                    primary_track=track,
                    confidence=Confidence.HIGH
                )
        
        # Use LLM for more complex normalization
        try:
            prompt = f"""Normalize this career goal into a simple track identifier.

Domain: {domain}
Career Goal: {career_goal_raw}

Rules:
- Return ONLY a snake_case track identifier (e.g., "software_engineering", "neet_pg")
- Do NOT invent tracks - use general terms if unsure
- Keep it simple and minimal

Track:"""
            
            response = await call_gemini(prompt, max_tokens=50)
            track = response.strip().lower().replace(" ", "_").replace("-", "_")
            
            # Clean up the track
            track = ''.join(c for c in track if c.isalnum() or c == '_')
            
            if track:
                return NormalizedGoal(
                    primary_track=track,
                    confidence=Confidence.MEDIUM
                )
        except Exception as e:
            print(f"⚠️ LLM normalization failed: {e}")
        
        # Fallback to generic track
        return NormalizedGoal(
            primary_track="general_" + domain.split("/")[0].strip().lower().replace(" ", "_"),
            confidence=Confidence.LOW
        )
    
    # ============================================
    # Task Creation
    # ============================================
    
    async def _create_domain_tasks(
        self,
        user_id: str,
        domain: str,
        normalized_goal: Dict,
        current_phase: str
    ) -> List[str]:
        """Create tasks based on domain"""
        
        tasks_created = []
        base_payload = TaskPayload(
            user_id=user_id,
            domain=domain,
            normalized_goal=normalized_goal,
            current_phase=current_phase
        ).dict()
        
        if domain == "Technology / Engineering":
            tasks = [
                AgentTask(
                    user_id=user_id,
                    agent_name="ResumeIntelligenceAgent",
                    task_type="await_resume_upload",
                    task_payload=base_payload
                ),
                AgentTask(
                    user_id=user_id,
                    agent_name="RoadmapAgent",
                    task_type="generate_foundation_roadmap",
                    task_payload=base_payload
                ),
                AgentTask(
                    user_id=user_id,
                    agent_name="MentorAgent",
                    task_type="welcome_guidance",
                    task_payload=base_payload
                )
            ]
        elif domain == "Medical / Healthcare":
            tasks = [
                AgentTask(
                    user_id=user_id,
                    agent_name="ResumeIntelligenceAgent",
                    task_type="await_cv_upload",
                    task_payload=base_payload
                ),
                AgentTask(
                    user_id=user_id,
                    agent_name="RoadmapAgent",
                    task_type="generate_exam_or_clinical_roadmap",
                    task_payload=base_payload
                ),
                AgentTask(
                    user_id=user_id,
                    agent_name="MentorAgent",
                    task_type="welcome_guidance",
                    task_payload=base_payload
                )
            ]
        else:
            # Should not reach here due to domain gating
            return tasks_created
        
        # Insert all tasks
        for task in tasks:
            success = await self._insert_task(task)
            if success:
                tasks_created.append(f"{task.agent_name}:{task.task_type}")
        
        return tasks_created
    
    async def _insert_task(self, task: AgentTask) -> bool:
        """Insert a single task into agent_tasks table"""
        url = f"{SUPABASE_REST_URL}/agent_tasks"
        
        response = await self.client.post(
            url, 
            headers=get_headers(),
            json=task.dict()
        )
        
        if response.status_code in [200, 201]:
            print(f"   ✅ Created: {task.agent_name} → {task.task_type}")
            return True
        else:
            print(f"   ❌ Failed: {task.agent_name} - {response.text}")
            return False
    
    # ============================================
    # Database Updates
    # ============================================
    
    async def _update_user_context(
        self,
        user_id: str,
        normalized_goal: Dict = None,
        current_phase: str = None
    ):
        """Update user_context with normalized data"""
        url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}"
        
        update_data = {}
        if normalized_goal is not None:
            update_data["normalized_goal"] = normalized_goal
        if current_phase is not None:
            update_data["current_phase"] = current_phase
        
        if update_data:
            response = await self.client.patch(url, headers=get_headers(), json=update_data)
            if response.status_code in [200, 204]:
                print(f"✅ Updated user_context")
            else:
                print(f"⚠️ Failed to update user_context: {response.text}")
    
    async def _mark_supervisor_initialized(self, user_id: str):
        """Mark supervisor_initialized = true"""
        url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}"
        
        response = await self.client.patch(
            url, 
            headers=get_headers(),
            json={"supervisor_initialized": True}
        )
        
        if response.status_code in [200, 204]:
            print(f"✅ Marked supervisor_initialized = true")
        else:
            print(f"⚠️ Failed to mark initialized: {response.text}")
    
    # ============================================
    # Error Logging
    # ============================================
    
    async def _log_error(self, user_id: str, error_message: str):
        """Log error to agent_tasks as a failed task"""
        task = AgentTask(
            user_id=user_id,
            agent_name="SupervisorAgent",
            task_type="initialization_error",
            task_payload={"error": error_message},
            status="failed"
        )
        
        try:
            await self._insert_task(task)
        except Exception as e:
            print(f"❌ Failed to log error: {e}")


# ============================================
# Public API
# ============================================

async def run_supervisor(user_id: str) -> SupervisorResult:
    """
    Run SupervisorAgent for a user.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        SupervisorResult with execution details
    """
    async with SupervisorAgent() as agent:
        return await agent.run(user_id)


# ============================================
# Test Scenarios
# ============================================

async def test_supervisor_scenarios():
    """
    Test scenarios for SupervisorAgent.
    Run manually for validation.
    """
    print("\n" + "="*60)
    print("SUPERVISOR AGENT TEST SCENARIOS")
    print("="*60)
    
    # These would be real user IDs from the database
    test_cases = [
        {
            "name": "1. New tech user after onboarding",
            "user_id": "test-tech-user-001",
            "expected": {
                "domain_supported": True,
                "limited_mode": False,
                "tasks_count": 3
            }
        },
        {
            "name": "2. New medical user after onboarding",
            "user_id": "test-medical-user-001",
            "expected": {
                "domain_supported": True,
                "limited_mode": False,
                "tasks_count": 3
            }
        },
        {
            "name": "3. Unsupported domain user",
            "user_id": "test-unsupported-001",
            "expected": {
                "domain_supported": False,
                "limited_mode": True,
                "tasks_count": 1
            }
        },
        {
            "name": "4. User refreshing page (idempotency)",
            "user_id": "test-tech-user-001",  # Same as #1
            "expected": {
                "success": True,
                "error": "Tasks already exist"
            }
        },
        {
            "name": "5. Partial onboarding data",
            "user_id": "test-partial-001",
            "expected": {
                "success": False,
                "error": "Onboarding not completed"
            }
        }
    ]
    
    for tc in test_cases:
        print(f"\n--- {tc['name']} ---")
        # result = await run_supervisor(tc["user_id"])
        # Validation would happen here
        print(f"Expected: {tc['expected']}")
    
    print("\n" + "="*60)
    print("Run these tests with real user data in development")
    print("="*60)
