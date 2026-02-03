"""
RoadmapAgent Worker

Generates structured career roadmaps with phased learning plans.
Handles both tech and medical domains with domain-specific logic.

This agent:
- Reads user_context
- Reads resume_analysis (if available)
- Uses RAG context injected externally
- Updates dashboard_state after roadmap generation

This agent MUST NOT:
- Parse resumes
- Conduct assessments
- Talk to users directly
- Assign tasks to other agents
- Decide system phase progression
"""

from typing import Any, Dict, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
import json
import uuid
import httpx

from app.config import settings
from app.llm.provider import get_llm_provider, LLMConfig, LLMModel
from app.services.dashboard_state import get_dashboard_state_service
from app.agents.worker_base import AgentWorker, TaskResult


# ============================================
# Input/Output Schemas
# ============================================

class RoadmapPhase(BaseModel):
    """Schema for a single roadmap phase"""
    phase_number: int = Field(..., ge=1, le=10)
    phase_title: str
    focus_areas: List[str]
    skills_or_subjects: List[str]
    expected_outcomes: List[str]
    completion_criteria: List[str]


class TechRoadmapOutput(BaseModel):
    """Output schema for tech domain roadmap"""
    domain: str = "tech"
    roadmap_version: str = "v1"
    phases: List[RoadmapPhase]
    overall_duration_estimate: str
    confidence_level: str = Field(..., pattern="^(low|medium|high)$")


class MedicalRoadmapOutput(BaseModel):
    """Output schema for medical domain roadmap"""
    domain: str = "medical"
    roadmap_version: str = "v1"
    phases: List[RoadmapPhase]
    overall_duration_estimate: str
    confidence_level: str = Field(..., pattern="^(low|medium|high)$")


class RoadmapInput(BaseModel):
    """Input schema for RoadmapAgent"""
    user_id: str
    domain: str = Field(..., pattern="^(tech|medical)$")
    normalized_goal: str
    self_assessed_level: str
    weekly_hours: int = Field(..., ge=1, le=80)
    resume_analysis: Optional[Dict[str, Any]] = None
    task_type: str
    rag_context: Optional[str] = None
    
    @validator('domain')
    def validate_domain(cls, v):
        if v not in ['tech', 'medical']:
            raise ValueError('domain must be "tech" or "medical"')
        return v
    
    @validator('normalized_goal')
    def validate_goal(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('normalized_goal is required and must be meaningful')
        return v.strip()


# ============================================
# LLM System Prompts
# ============================================

TECH_ROADMAP_SYSTEM_PROMPT = """You are a Career Roadmap Generator for TECHNOLOGY professionals.

Your task is to create a structured, phased learning roadmap based on the user's goal and current level.

MANDATORY PHASES (in order):

Phase 1: Foundations
- Programming basics (syntax, logic, data structures)
- Core CS fundamentals (algorithms, complexity basics)
- Version control basics (Git)

Phase 2: Core Skills
- Domain-specific skills based on goal
- Tooling & workflows (IDE, debugging, testing)
- Best practices and coding standards

Phase 3: Application
- Real-world projects
- Problem-solving depth (LeetCode/HackerRank if relevant)
- Portfolio building

Phase 4: Readiness
- Interview preparation
- Resume alignment with target roles
- Weak area reinforcement
- Mock interviews and system design (if applicable)

PERSONALIZATION RULES:
- Beginner level → Include more foundational content, slower pace
- Intermediate level → Lighter Phase 1, heavier Phase 2-3
- Advanced level → Focus on Phase 3-4, skip basics
- Low weekly hours (< 10) → Extend timeline, focus on essentials
- High weekly hours (> 20) → Compressed timeline, add depth

RESUME GAP HANDLING:
- Missing programming experience → Extend Phase 1
- Weak project portfolio → Extend Phase 3
- No relevant experience → Add foundational modules

OUTPUT FORMAT:
You MUST respond with ONLY valid JSON matching this exact structure:
{
  "domain": "tech",
  "roadmap_version": "v1",
  "phases": [
    {
      "phase_number": 1,
      "phase_title": "string",
      "focus_areas": ["string"],
      "skills_or_subjects": ["string"],
      "expected_outcomes": ["string"],
      "completion_criteria": ["string"]
    }
  ],
  "overall_duration_estimate": "X-Y months",
  "confidence_level": "low|medium|high"
}

FORBIDDEN:
- Do NOT promise placements or job guarantees
- Do NOT use vague phrases like "master everything"
- Do NOT add external course links
- Do NOT skip foundational phases for beginners
- Do NOT output markdown or prose
- Do NOT hallucinate technologies not relevant to the goal"""


MEDICAL_ROADMAP_SYSTEM_PROMPT = """You are a Career Roadmap Generator for MEDICAL professionals.

Your task is to create a structured, track-based learning roadmap based on the user's goal and current level.

MANDATORY PHASES (in order):

Phase 1: Core Subjects
- Foundational medical sciences (Anatomy, Physiology, Biochemistry)
- Pathology and Pharmacology basics
- Understanding of basic clinical concepts

Phase 2: Clinical Understanding
- Subject integration across systems
- Clinical exposure and case-based learning
- History taking and examination skills

Phase 3: Exam / Track Preparation
- NEET PG / USMLE / Clinical readiness (based on goal)
- High-yield topics and revision
- Test-taking strategies
- Previous year analysis

Phase 4: Reinforcement
- Revision cycles (spaced repetition)
- Weak area targeting
- Mock tests and analysis
- Final consolidation

STUDY INTENT TYPES:
- Concept: Deep understanding, first-time learning
- Revision: Quick review, memory refresh
- Practice: MCQs, case discussions, application

PERSONALIZATION RULES:
- MBBS 1st-2nd year → Heavy Phase 1, light Phase 3
- MBBS 3rd-4th year → Balanced Phases 2-3
- Intern/Graduate → Focus on Phase 3-4
- Low weekly hours → Extend timeline, prioritize high-yield
- High weekly hours → Add depth, more practice sets

TRACK-SPECIFIC ADJUSTMENTS:
- NEET PG → Emphasize MCQ patterns, subject-wise weightage
- USMLE → Step-based preparation, clinical correlations
- Clinical Practice → More case-based learning, less exam focus

OUTPUT FORMAT:
You MUST respond with ONLY valid JSON matching this exact structure:
{
  "domain": "medical",
  "roadmap_version": "v1",
  "phases": [
    {
      "phase_number": 1,
      "phase_title": "string",
      "focus_areas": ["string"],
      "skills_or_subjects": ["string"],
      "expected_outcomes": ["string"],
      "completion_criteria": ["string"]
    }
  ],
  "overall_duration_estimate": "X-Y months",
  "confidence_level": "low|medium|high"
}

FORBIDDEN:
- Do NOT promise exam ranks or scores
- Do NOT use phrases like "guarantee success"
- Do NOT add external coaching links
- Do NOT skip foundational phases
- Do NOT output markdown or prose
- Do NOT hallucinate subjects or exam patterns"""


# ============================================
# RoadmapAgent Worker Class
# ============================================

class RoadmapAgentWorker(AgentWorker):
    """
    Worker class for RoadmapAgent.
    
    Handles:
    - generate_foundation_roadmap: Creates initial career roadmap
    - generate_exam_or_clinical_roadmap: Creates exam/clinical focused roadmap
    """
    
    SUPPORTED_TASK_TYPES = [
        "generate_foundation_roadmap",
        "generate_exam_or_clinical_roadmap"
    ]
    
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        self.rest_url = f"{self.supabase_url}/rest/v1"
        self.llm_provider = get_llm_provider()
        self.dashboard_service = get_dashboard_state_service()
    
    @property
    def agent_name(self) -> str:
        return "RoadmapAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return self.SUPPORTED_TASK_TYPES
    
    @property
    def output_tables(self) -> List[str]:
        return ["roadmaps", "dashboard_state"]
    
    def _get_headers(self):
        """Get headers for Supabase REST API"""
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Main execution entry point.
        
        Args:
            task_payload: The task_payload from agent_tasks table
            
        Returns:
            TaskResult with success/failure and output data
        """
        start_time = datetime.now()
        
        # Handle both direct payload and wrapped task format
        if "task_payload" in task_payload:
            # Legacy format - task object with nested payload
            task_id = task_payload.get("id")
            task_type = task_payload.get("task_type")
            payload = task_payload.get("task_payload", {})
        else:
            # New format - direct payload
            task_id = task_payload.get("task_id")
            task_type = task_payload.get("task_type")
            payload = task_payload
        
        user_id = payload.get("user_id")
        
        # Validate task type
        if task_type not in self.SUPPORTED_TASK_TYPES:
            await self._log_error(
                user_id=user_id,
                error=f"Unknown task_type: {task_type}",
                task_id=task_id
            )
            await self._update_task_status(task_id, "failed")
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return TaskResult(
                success=False,
                error=f"Unknown task_type: {task_type}. Valid types: {self.SUPPORTED_TASK_TYPES}",
                execution_time_ms=execution_time
            )
        
        try:
            # Validate input
            try:
                input_data = RoadmapInput(**payload)
            except Exception as e:
                await self._log_error(user_id, f"Validation error: {str(e)}", task_id)
                await self._update_task_status(task_id, "failed")
                execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                return TaskResult(
                    success=False,
                    error=f"Input validation failed: {str(e)}",
                    execution_time_ms=execution_time
                )
            
            # Route to appropriate handler based on domain
            if input_data.domain == "tech":
                result = await self._generate_tech_roadmap(input_data, task_type)
            elif input_data.domain == "medical":
                result = await self._generate_medical_roadmap(input_data, task_type)
            else:
                # This shouldn't happen due to validation, but just in case
                raise ValueError(f"Invalid domain: {input_data.domain}")
            
            if result["success"]:
                # Save roadmap to database
                roadmap_id = await self._save_roadmap(
                    user_id=input_data.user_id,
                    domain=input_data.domain,
                    roadmap_data=result["roadmap"]
                )
                
                # Initialize phase progress
                await self._initialize_phase_progress(
                    roadmap_id=roadmap_id,
                    user_id=input_data.user_id,
                    total_phases=len(result["roadmap"]["phases"])
                )
                
                # Update dashboard_state - roadmap is ready
                await self.dashboard_service.mark_roadmap_ready(
                    user_id=input_data.user_id,
                    phase="foundation",
                    domain=input_data.domain
                )
                
                # Log success
                await self._log_activity(
                    user_id=input_data.user_id,
                    action=f"roadmap_generated_{task_type}",
                    input_summary=f"Goal: {input_data.normalized_goal}, Level: {input_data.self_assessed_level}",
                    output_summary=f"Generated {len(result['roadmap']['phases'])}-phase {input_data.domain} roadmap",
                    metadata={
                        "roadmap_id": roadmap_id,
                        "confidence_level": result["roadmap"]["confidence_level"],
                        "duration_estimate": result["roadmap"]["overall_duration_estimate"]
                    }
                )
                
                # Mark task as completed
                await self._update_task_status(task_id, "completed")
                
                execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                return TaskResult(
                    success=True,
                    output={
                        "roadmap_id": roadmap_id,
                        "roadmap": result["roadmap"]
                    },
                    summary=f"Generated {len(result['roadmap']['phases'])}-phase {input_data.domain} roadmap",
                    tables_updated=["roadmaps", "roadmap_phase_progress", "dashboard_state"],
                    execution_time_ms=execution_time
                )
            else:
                await self._update_task_status(task_id, "failed")
                execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                return TaskResult(
                    success=False,
                    error=result.get("error", "Unknown error"),
                    execution_time_ms=execution_time
                )
                
        except Exception as e:
            await self._log_error(user_id, f"Execution error: {str(e)}", task_id)
            await self._update_task_status(task_id, "failed")
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return TaskResult(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )
    
    # ============================================
    # Tech Roadmap Generation
    # ============================================
    
    async def _generate_tech_roadmap(
        self, 
        input_data: RoadmapInput,
        task_type: str
    ) -> Dict[str, Any]:
        """Generate roadmap for tech domain"""
        
        # Build personalization context
        personalization = self._build_personalization_context(input_data)
        
        # Build the prompt
        prompt = f"""Generate a career roadmap for this tech professional:

GOAL: {input_data.normalized_goal}

CURRENT LEVEL: {input_data.self_assessed_level}

WEEKLY HOURS AVAILABLE: {input_data.weekly_hours} hours

{personalization}

{f"RAG CONTEXT (use if relevant):{chr(10)}{input_data.rag_context}" if input_data.rag_context else ""}

TASK TYPE: {task_type}
{"Focus on foundational skills and core competency building." if task_type == "generate_foundation_roadmap" else "Focus on specialization and interview/job readiness."}

Generate a complete phased roadmap following the mandatory phase structure.
Respond with ONLY the JSON output, no markdown or explanation."""

        # Call LLM
        try:
            response = await self._call_llm(
                prompt=prompt,
                system_prompt=TECH_ROADMAP_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            # Parse and validate response
            roadmap = self._parse_llm_response(response)
            
            if not roadmap:
                return {
                    "success": False,
                    "error": "Failed to parse LLM response as valid JSON"
                }
            
            # Validate phase structure
            validation_result = self._validate_tech_roadmap(roadmap)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": f"Roadmap validation failed: {validation_result['errors']}"
                }
            
            # Ensure domain is correct
            roadmap["domain"] = "tech"
            
            return {
                "success": True,
                "roadmap": roadmap
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Tech roadmap generation failed: {str(e)}"
            }
    
    def _validate_tech_roadmap(self, roadmap: Dict) -> Dict[str, Any]:
        """Validate tech roadmap structure and content"""
        errors = []
        
        # Check required fields
        if "phases" not in roadmap:
            errors.append("Missing 'phases' array")
            return {"valid": False, "errors": errors}
        
        phases = roadmap.get("phases", [])
        
        # Must have at least 4 phases
        if len(phases) < 4:
            errors.append(f"Tech roadmap must have at least 4 phases, got {len(phases)}")
        
        # Validate phase structure
        required_phase_fields = [
            "phase_number", "phase_title", "focus_areas",
            "skills_or_subjects", "expected_outcomes", "completion_criteria"
        ]
        
        for i, phase in enumerate(phases):
            for field in required_phase_fields:
                if field not in phase:
                    errors.append(f"Phase {i+1} missing '{field}'")
            
            # Check phase number ordering
            if phase.get("phase_number") != i + 1:
                errors.append(f"Phase {i+1} has incorrect phase_number: {phase.get('phase_number')}")
        
        # Validate confidence level
        if roadmap.get("confidence_level") not in ["low", "medium", "high"]:
            errors.append("Invalid confidence_level")
        
        return {"valid": len(errors) == 0, "errors": errors}
    
    # ============================================
    # Medical Roadmap Generation
    # ============================================
    
    async def _generate_medical_roadmap(
        self, 
        input_data: RoadmapInput,
        task_type: str
    ) -> Dict[str, Any]:
        """Generate roadmap for medical domain"""
        
        # Build personalization context
        personalization = self._build_personalization_context(input_data)
        
        # Determine exam track from goal
        exam_track = self._detect_medical_track(input_data.normalized_goal)
        
        # Build the prompt
        prompt = f"""Generate a career roadmap for this medical professional:

GOAL: {input_data.normalized_goal}

DETECTED TRACK: {exam_track}

CURRENT LEVEL: {input_data.self_assessed_level}

WEEKLY HOURS AVAILABLE: {input_data.weekly_hours} hours

{personalization}

{f"RAG CONTEXT (use if relevant):{chr(10)}{input_data.rag_context}" if input_data.rag_context else ""}

TASK TYPE: {task_type}
{"Focus on core subjects and clinical foundation building." if task_type == "generate_foundation_roadmap" else "Focus on exam preparation and clinical readiness."}

Generate a complete phased roadmap following the mandatory phase structure.
Respond with ONLY the JSON output, no markdown or explanation."""

        # Call LLM
        try:
            response = await self._call_llm(
                prompt=prompt,
                system_prompt=MEDICAL_ROADMAP_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            # Parse and validate response
            roadmap = self._parse_llm_response(response)
            
            if not roadmap:
                return {
                    "success": False,
                    "error": "Failed to parse LLM response as valid JSON"
                }
            
            # Validate phase structure
            validation_result = self._validate_medical_roadmap(roadmap)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": f"Roadmap validation failed: {validation_result['errors']}"
                }
            
            # Ensure domain is correct
            roadmap["domain"] = "medical"
            
            return {
                "success": True,
                "roadmap": roadmap
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Medical roadmap generation failed: {str(e)}"
            }
    
    def _detect_medical_track(self, goal: str) -> str:
        """Detect medical exam track from goal"""
        goal_lower = goal.lower()
        
        if "neet" in goal_lower or "pg" in goal_lower:
            return "NEET PG"
        elif "usmle" in goal_lower or "step" in goal_lower:
            return "USMLE"
        elif "fmge" in goal_lower:
            return "FMGE"
        elif "clinic" in goal_lower or "practice" in goal_lower:
            return "Clinical Practice"
        elif "research" in goal_lower:
            return "Medical Research"
        else:
            return "General Medical"
    
    def _validate_medical_roadmap(self, roadmap: Dict) -> Dict[str, Any]:
        """Validate medical roadmap structure and content"""
        errors = []
        
        # Check required fields
        if "phases" not in roadmap:
            errors.append("Missing 'phases' array")
            return {"valid": False, "errors": errors}
        
        phases = roadmap.get("phases", [])
        
        # Must have at least 4 phases
        if len(phases) < 4:
            errors.append(f"Medical roadmap must have at least 4 phases, got {len(phases)}")
        
        # Validate phase structure
        required_phase_fields = [
            "phase_number", "phase_title", "focus_areas",
            "skills_or_subjects", "expected_outcomes", "completion_criteria"
        ]
        
        for i, phase in enumerate(phases):
            for field in required_phase_fields:
                if field not in phase:
                    errors.append(f"Phase {i+1} missing '{field}'")
            
            # Check phase number ordering
            if phase.get("phase_number") != i + 1:
                errors.append(f"Phase {i+1} has incorrect phase_number: {phase.get('phase_number')}")
        
        # Validate confidence level
        if roadmap.get("confidence_level") not in ["low", "medium", "high"]:
            errors.append("Invalid confidence_level")
        
        return {"valid": len(errors) == 0, "errors": errors}
    
    # ============================================
    # Personalization Logic
    # ============================================
    
    def _build_personalization_context(self, input_data: RoadmapInput) -> str:
        """Build personalization context from input data"""
        
        lines = ["PERSONALIZATION FACTORS:"]
        
        # Self-assessed level interpretation
        level = input_data.self_assessed_level.lower()
        if "beginner" in level or "novice" in level or "new" in level:
            lines.append("- Level: BEGINNER - Include comprehensive foundational content")
            lines.append("- Pace: Slower progression recommended")
        elif "intermediate" in level or "some experience" in level:
            lines.append("- Level: INTERMEDIATE - Lighter foundations, heavier core skills")
            lines.append("- Pace: Standard progression")
        elif "advanced" in level or "experienced" in level or "expert" in level:
            lines.append("- Level: ADVANCED - Focus on application and readiness")
            lines.append("- Pace: Accelerated progression possible")
        else:
            lines.append(f"- Level: {input_data.self_assessed_level}")
        
        # Weekly hours interpretation
        hours = input_data.weekly_hours
        if hours < 10:
            lines.append(f"- Hours: {hours}/week - LOW availability, extend timeline")
            lines.append("- Focus on essentials only, skip nice-to-haves")
        elif hours < 20:
            lines.append(f"- Hours: {hours}/week - MODERATE availability")
            lines.append("- Standard depth and timeline")
        else:
            lines.append(f"- Hours: {hours}/week - HIGH availability")
            lines.append("- Can add depth and compress timeline")
        
        # Resume analysis insights
        if input_data.resume_analysis:
            ra = input_data.resume_analysis
            lines.append("\nRESUME INSIGHTS:")
            
            # Overall score
            if "overall_score" in ra:
                score = ra["overall_score"]
                if score < 50:
                    lines.append(f"- Resume score: {score}/100 - WEAK, reinforce fundamentals")
                elif score < 75:
                    lines.append(f"- Resume score: {score}/100 - MODERATE, address gaps")
                else:
                    lines.append(f"- Resume score: {score}/100 - STRONG base to build on")
            
            # Missing elements
            if "missing_elements" in ra and ra["missing_elements"]:
                lines.append(f"- Gaps identified: {', '.join(ra['missing_elements'][:5])}")
                lines.append("- Address these gaps in appropriate phases")
            
            # Extracted skills (for tech)
            if "extracted_data" in ra:
                extracted = ra["extracted_data"]
                if "skills" in extracted:
                    skills = extracted["skills"]
                    existing = []
                    if isinstance(skills, dict):
                        for category, skill_list in skills.items():
                            if skill_list:
                                existing.extend(skill_list[:3])
                    if existing:
                        lines.append(f"- Existing skills: {', '.join(existing[:8])}")
                        lines.append("- Build upon these, don't repeat basics")
        else:
            lines.append("\nNo resume analysis available - assume starting from basics")
        
        return "\n".join(lines)
    
    # ============================================
    # Database Operations
    # ============================================
    
    async def _save_roadmap(
        self,
        user_id: str,
        domain: str,
        roadmap_data: Dict[str, Any]
    ) -> str:
        """Save roadmap to career_roadmap table"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First deactivate existing active roadmap
            deactivate_url = f"{self.rest_url}/career_roadmap"
            await client.patch(
                f"{deactivate_url}?user_id=eq.{user_id}&is_active=eq.true",
                headers=self._get_headers(),
                json={"is_active": False}
            )
            
            # Insert new roadmap
            roadmap_id = str(uuid.uuid4())
            insert_data = {
                "id": roadmap_id,
                "user_id": user_id,
                "domain": domain,
                "roadmap_json": roadmap_data,
                "roadmap_version": roadmap_data.get("roadmap_version", "v1"),
                "confidence_level": roadmap_data.get("confidence_level", "medium"),
                "overall_duration_estimate": roadmap_data.get("overall_duration_estimate"),
                "is_active": True
            }
            
            response = await client.post(
                f"{self.rest_url}/career_roadmap",
                headers=self._get_headers(),
                json=insert_data
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to save roadmap: {response.text}")
            
            return roadmap_id
    
    async def _initialize_phase_progress(
        self,
        roadmap_id: str,
        user_id: str,
        total_phases: int
    ) -> None:
        """Initialize phase progress entries for the roadmap"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Delete existing progress for this roadmap (if any)
            await client.delete(
                f"{self.rest_url}/roadmap_phase_progress?roadmap_id=eq.{roadmap_id}",
                headers=self._get_headers()
            )
            
            # Create progress entries for each phase
            for i in range(1, total_phases + 1):
                progress_data = {
                    "id": str(uuid.uuid4()),
                    "roadmap_id": roadmap_id,
                    "user_id": user_id,
                    "phase_number": i,
                    "status": "active" if i == 1 else "locked",
                    "progress_percentage": 0,
                    "started_at": datetime.utcnow().isoformat() if i == 1 else None
                }
                
                await client.post(
                    f"{self.rest_url}/roadmap_phase_progress",
                    headers=self._get_headers(),
                    json=progress_data
                )
    
    async def _update_task_status(self, task_id: str, status: str) -> None:
        """Update agent task status"""
        if not task_id:
            return
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.patch(
                f"{self.rest_url}/agent_tasks?id=eq.{task_id}",
                headers=self._get_headers(),
                json={
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                }
            )
    
    async def _log_activity(
        self,
        user_id: str,
        action: str,
        input_summary: str,
        output_summary: str,
        metadata: Optional[Dict] = None
    ) -> None:
        """Log activity to agent_activity_log"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
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
            
            await client.post(
                f"{self.rest_url}/agent_activity_log",
                headers=self._get_headers(),
                json=log_entry
            )
    
    async def _log_error(
        self, 
        user_id: Optional[str], 
        error: str, 
        task_id: Optional[str] = None
    ) -> None:
        """Log error to agent_activity_log"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            log_entry = {
                "id": str(uuid.uuid4()),
                "user_id": user_id or "system",
                "agent_name": self.agent_name,
                "action": "error",
                "input_summary": f"Task: {task_id}" if task_id else "Unknown task",
                "output_summary": error,
                "metadata": {"task_id": task_id, "error_type": "execution_error"},
                "created_at": datetime.utcnow().isoformat()
            }
            
            await client.post(
                f"{self.rest_url}/agent_activity_log",
                headers=self._get_headers(),
                json=log_entry
            )
    
    # ============================================
    # LLM Operations
    # ============================================
    
    async def _call_llm(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7
    ) -> str:
        """Call LLM via LLMProvider"""
        
        config = LLMConfig(
            model=LLMModel.GEMMA_7B.value,
            temperature=temperature,
            max_tokens=4000
        )
        
        response = await self.llm_provider.complete(
            agent_name=self.agent_name,
            system_prompt=system_prompt,
            user_prompt=prompt,
            config=config
        )
        
        if not response.success:
            raise Exception(f"LLM API error: {response.error}")
        
        return response.content
    
    def _parse_llm_response(self, response: str) -> Optional[Dict]:
        """Parse LLM response as JSON"""
        
        # Clean up response
        text = response.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object in response
            start = text.find("{")
            end = text.rfind("}") + 1
            
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
            
            return None


# ============================================
# Factory function for registry
# ============================================

def create_roadmap_agent_worker() -> RoadmapAgentWorker:
    """Factory function to create RoadmapAgentWorker instance"""
    return RoadmapAgentWorker()
