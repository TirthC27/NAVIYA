"""
SkillEvaluationAgent Worker

Generates and evaluates skill assessments.
Measures user proficiency objectively with scores and levels.

This agent:
- Uses roadmap phases as reference
- Uses RAG for question standards
- Updates dashboard_state after evaluation

This agent MUST NOT:
- Teach concepts
- Give career advice
- Generate roadmaps
- Modify resume data
- Decide phase progression
"""

from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import json
import uuid
import httpx

from app.config import settings
from app.llm.provider import get_llm_provider, LLMConfig, LLMModel
from app.llm.opik_eval_prompt import inject_opik_eval, parse_opik_eval, log_opik_eval
from app.services.dashboard_state import get_dashboard_state_service


# ============================================
# Input/Output Schemas
# ============================================

class TechQuestion(BaseModel):
    """Schema for a tech assessment question"""
    question_id: str
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: str
    skill_tag: str


class MedicalQuestion(BaseModel):
    """Schema for a medical assessment question"""
    question_id: str
    question_text: str
    options: List[str] = Field(..., min_items=4, max_items=4)
    correct_option: str = Field(..., pattern="^[A-D]$")
    subject_tag: str


class AssessmentInput(BaseModel):
    """Input schema for SkillEvaluationAgent"""
    user_id: str
    domain: str = Field(..., pattern="^(tech|medical)$")
    current_phase: Optional[int] = 1
    skill_or_subject: str
    task_type: str
    user_responses: Optional[List[Dict[str, str]]] = None
    rag_context: Optional[str] = None
    
    @validator('domain')
    def validate_domain(cls, v):
        if v not in ['tech', 'medical']:
            raise ValueError('domain must be "tech" or "medical"')
        return v
    
    @validator('skill_or_subject')
    def validate_skill(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('skill_or_subject is required')
        return v.strip()


class EvaluationOutput(BaseModel):
    """Output schema for skill evaluation"""
    domain: str
    skill_or_subject: str
    raw_score: float
    proficiency_level: str
    confidence_level: str
    weak_areas: List[str]
    recommendation: str


# ============================================
# LLM System Prompts
# ============================================

TECH_ASSESSMENT_SYSTEM_PROMPT = """You are a Technical Skills Assessment Generator.

Your task is to generate assessment questions for a specific technical skill.

RULES:
1. Generate 5-10 questions aligned with the skill and phase level
2. Mix conceptual understanding and practical reasoning
3. Questions must be clear and unambiguous
4. Avoid trivia or obscure facts
5. Focus on industry-relevant knowledge
6. Match difficulty to the current_phase (1=basic, 2-3=intermediate, 4+=advanced)

QUESTION TYPES:
- Multiple choice (provide 4 options)
- True/False
- Short conceptual questions

OUTPUT FORMAT - JSON ONLY:
{
  "questions": [
    {
      "question_id": "q1",
      "question_text": "string",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_answer": "A",
      "skill_tag": "string"
    }
  ]
}

FORBIDDEN:
- Do NOT include questions beyond the current phase level
- Do NOT mix medical and tech content
- Do NOT provide explanations or teaching content
- Do NOT output markdown"""


MEDICAL_ASSESSMENT_SYSTEM_PROMPT = """You are a Medical Assessment Question Generator.

Your task is to generate exam-style MCQs for medical subjects.

RULES:
1. Generate 5-10 MCQs in exam format (NEET PG / USMLE style)
2. Each question has exactly 4 options (A-D)
3. Only ONE correct answer per question
4. Questions must be clinically relevant
5. Avoid obscure or outdated information
6. Match difficulty to the current_phase

QUESTION STRUCTURE:
- Clear clinical vignette or direct question
- Precise, unambiguous options
- No "all of the above" or "none of the above"

OUTPUT FORMAT - JSON ONLY:
{
  "questions": [
    {
      "question_id": "q1",
      "question_text": "string",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct_option": "A",
      "subject_tag": "string"
    }
  ]
}

FORBIDDEN:
- Do NOT include questions beyond current phase
- Do NOT mix tech and medical content
- Do NOT provide explanations
- Do NOT output markdown"""


EVALUATION_SYSTEM_PROMPT = """You are a Skill Evaluation Analyzer.

Your task is to analyze user responses and provide an evaluation.

INPUT:
- Questions with correct answers
- User's responses
- Domain and skill context

ANALYSIS STEPS:
1. Compare each user response with correct answer
2. Identify patterns in wrong answers
3. Determine weak areas based on skill_tags/subject_tags
4. Calculate confidence based on consistency

SCORING RULES:
- raw_score = (correct_answers / total_questions) * 100
- raw_score < 40% → proficiency_level = "beginner"
- 40% <= raw_score <= 70% → proficiency_level = "intermediate"
- raw_score > 70% → proficiency_level = "advanced"

CONFIDENCE RULES:
- "low" → inconsistent answers, random guessing pattern
- "medium" → some consistency but clear weak areas
- "high" → strong consistency, few weak areas

OUTPUT FORMAT - JSON ONLY:
{
  "domain": "tech|medical",
  "skill_or_subject": "string",
  "raw_score": number,
  "proficiency_level": "beginner|intermediate|advanced",
  "confidence_level": "low|medium|high",
  "weak_areas": ["string"],
  "recommendation": "string"
}

FORBIDDEN:
- Do NOT inflate scores
- Do NOT provide teaching content
- Do NOT output markdown"""


# ============================================
# SkillEvaluationAgent Worker Class
# ============================================

class SkillEvaluationAgentWorker:
    """
    Worker class for SkillEvaluationAgent.
    
    Handles:
    - generate_skill_assessment: Creates assessment questions
    - evaluate_skill_assessment: Evaluates user responses
    """
    
    agent_name = "SkillEvaluationAgent"
    
    VALID_TASK_TYPES = [
        "generate_skill_assessment",
        "evaluate_skill_assessment"
    ]
    
    # Cooldown period for retakes (24 hours)
    RETAKE_COOLDOWN_HOURS = 24
    
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        self.rest_url = f"{self.supabase_url}/rest/v1"
        self.llm_provider = get_llm_provider()
        self.dashboard_service = get_dashboard_state_service()
    
    def _get_headers(self):
        """Get headers for Supabase REST API"""
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main execution entry point.
        
        Args:
            task: The agent task containing task_type and task_payload
            
        Returns:
            Execution result with status and output
        """
        task_id = task.get("id")
        task_type = task.get("task_type")
        payload = task.get("task_payload", {})
        user_id = payload.get("user_id")
        
        # Validate task type
        if task_type not in self.VALID_TASK_TYPES:
            await self._log_error(
                user_id=user_id,
                error=f"Unknown task_type: {task_type}",
                task_id=task_id
            )
            await self._update_task_status(task_id, "failed")
            return {
                "success": False,
                "error": f"Unknown task_type: {task_type}. Valid types: {self.VALID_TASK_TYPES}"
            }
        
        try:
            # Validate input
            try:
                input_data = AssessmentInput(**payload)
            except Exception as e:
                await self._log_error(user_id, f"Validation error: {str(e)}", task_id)
                await self._update_task_status(task_id, "failed")
                return {"success": False, "error": f"Input validation failed: {str(e)}"}
            
            # Route to appropriate handler
            if task_type == "generate_skill_assessment":
                result = await self._generate_assessment(input_data)
            elif task_type == "evaluate_skill_assessment":
                result = await self._evaluate_assessment(input_data)
            else:
                result = {"success": False, "error": f"Unhandled task_type: {task_type}"}
            
            if result["success"]:
                # Log success
                await self._log_activity(
                    user_id=input_data.user_id,
                    action=task_type,
                    input_summary=f"Skill: {input_data.skill_or_subject}, Domain: {input_data.domain}",
                    output_summary=f"Completed {task_type}" + (
                        f" with score {result.get('evaluation', {}).get('raw_score', 'N/A')}%" 
                        if 'evaluation' in result else ""
                    ),
                    metadata={"task_id": task_id}
                )
                
                # Update dashboard_state after successful evaluation
                if task_type == "evaluate_skill_assessment":
                    await self.dashboard_service.mark_skill_eval_ready(input_data.user_id)
                
                # Mark task as completed
                await self._update_task_status(task_id, "completed")
            else:
                await self._update_task_status(task_id, "failed")
            
            return result
                
        except Exception as e:
            await self._log_error(user_id, f"Execution error: {str(e)}", task_id)
            await self._update_task_status(task_id, "failed")
            return {"success": False, "error": str(e)}
    
    # ============================================
    # Assessment Generation
    # ============================================
    
    async def _generate_assessment(self, input_data: AssessmentInput) -> Dict[str, Any]:
        """Generate skill assessment questions"""
        
        # Build prompt based on domain
        if input_data.domain == "tech":
            return await self._generate_tech_assessment(input_data)
        elif input_data.domain == "medical":
            return await self._generate_medical_assessment(input_data)
        else:
            return {"success": False, "error": f"Invalid domain: {input_data.domain}"}
    
    async def _generate_tech_assessment(self, input_data: AssessmentInput) -> Dict[str, Any]:
        """Generate tech assessment questions"""
        
        difficulty = self._get_difficulty_for_phase(input_data.current_phase or 1)
        
        prompt = f"""Generate a technical skills assessment for:

SKILL: {input_data.skill_or_subject}
DIFFICULTY LEVEL: {difficulty}
CURRENT PHASE: {input_data.current_phase or 1}

{f"CONTEXT FROM KNOWLEDGE BASE:{chr(10)}{input_data.rag_context}" if input_data.rag_context else ""}

Generate 5-8 questions that test understanding of this skill at the {difficulty} level.
Include a mix of conceptual and practical questions.

Output ONLY the JSON with questions array."""

        try:
            response = await self._call_llm(
                prompt=prompt,
                system_prompt=TECH_ASSESSMENT_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            questions = self._parse_llm_response(response)
            
            if not questions or "questions" not in questions:
                return {"success": False, "error": "Failed to generate questions"}
            
            return {
                "success": True,
                "assessment": {
                    "domain": "tech",
                    "skill_or_subject": input_data.skill_or_subject,
                    "difficulty": difficulty,
                    "questions": questions["questions"],
                    "total_questions": len(questions["questions"])
                }
            }
            
        except Exception as e:
            return {"success": False, "error": f"Tech assessment generation failed: {str(e)}"}
    
    async def _generate_medical_assessment(self, input_data: AssessmentInput) -> Dict[str, Any]:
        """Generate medical assessment questions"""
        
        difficulty = self._get_difficulty_for_phase(input_data.current_phase or 1)
        
        prompt = f"""Generate a medical subject assessment for:

SUBJECT: {input_data.skill_or_subject}
DIFFICULTY LEVEL: {difficulty}
CURRENT PHASE: {input_data.current_phase or 1}

{f"CONTEXT FROM KNOWLEDGE BASE:{chr(10)}{input_data.rag_context}" if input_data.rag_context else ""}

Generate 5-8 MCQs in exam style (NEET PG / USMLE format).
Each question must have exactly 4 options (A-D) with one correct answer.

Output ONLY the JSON with questions array."""

        try:
            response = await self._call_llm(
                prompt=prompt,
                system_prompt=MEDICAL_ASSESSMENT_SYSTEM_PROMPT,
                temperature=0.7
            )
            
            questions = self._parse_llm_response(response)
            
            if not questions or "questions" not in questions:
                return {"success": False, "error": "Failed to generate questions"}
            
            return {
                "success": True,
                "assessment": {
                    "domain": "medical",
                    "skill_or_subject": input_data.skill_or_subject,
                    "difficulty": difficulty,
                    "questions": questions["questions"],
                    "total_questions": len(questions["questions"])
                }
            }
            
        except Exception as e:
            return {"success": False, "error": f"Medical assessment generation failed: {str(e)}"}
    
    def _get_difficulty_for_phase(self, phase: int) -> str:
        """Map phase to difficulty level"""
        if phase <= 1:
            return "basic"
        elif phase <= 2:
            return "intermediate"
        elif phase <= 3:
            return "advanced"
        else:
            return "expert"
    
    # ============================================
    # Assessment Evaluation
    # ============================================
    
    async def _evaluate_assessment(self, input_data: AssessmentInput) -> Dict[str, Any]:
        """Evaluate user responses to assessment"""
        
        if not input_data.user_responses:
            return {
                "success": False,
                "error": "user_responses is required for evaluation"
            }
        
        # Get stored questions if available (from previous generate task)
        # For now, we'll use LLM to evaluate based on responses
        
        prompt = f"""Evaluate the following skill assessment:

DOMAIN: {input_data.domain}
SKILL/SUBJECT: {input_data.skill_or_subject}

USER RESPONSES:
{json.dumps(input_data.user_responses, indent=2)}

{f"CONTEXT:{chr(10)}{input_data.rag_context}" if input_data.rag_context else ""}

Analyze the responses and provide:
1. Calculate raw_score (percentage of correct answers)
2. Determine proficiency_level (beginner/intermediate/advanced)
3. Assess confidence_level (low/medium/high based on consistency)
4. Identify weak_areas (topics where user struggled)
5. Provide a brief recommendation

Output ONLY the JSON evaluation."""

        try:
            response = await self._call_llm(
                prompt=prompt,
                system_prompt=EVALUATION_SYSTEM_PROMPT,
                temperature=0.3  # Lower temperature for consistent evaluation
            )
            
            evaluation = self._parse_llm_response(response)
            
            if not evaluation:
                # Fallback: Calculate basic score from responses
                evaluation = self._calculate_basic_evaluation(input_data)
            
            # Ensure required fields
            evaluation["domain"] = input_data.domain
            evaluation["skill_or_subject"] = input_data.skill_or_subject
            
            # Validate and fix proficiency level
            raw_score = evaluation.get("raw_score", 0)
            evaluation["proficiency_level"] = self._calculate_proficiency(raw_score)
            
            # Save to database
            assessment_id = await self._save_assessment(
                user_id=input_data.user_id,
                evaluation=evaluation,
                current_phase=input_data.current_phase,
                responses=input_data.user_responses
            )
            
            evaluation["assessment_id"] = assessment_id
            
            return {
                "success": True,
                "evaluation": evaluation
            }
            
        except Exception as e:
            return {"success": False, "error": f"Evaluation failed: {str(e)}"}
    
    def _calculate_basic_evaluation(self, input_data: AssessmentInput) -> Dict[str, Any]:
        """Fallback basic evaluation from responses"""
        
        responses = input_data.user_responses or []
        total = len(responses)
        correct = sum(1 for r in responses if r.get("is_correct", False))
        
        raw_score = (correct / total * 100) if total > 0 else 0
        
        return {
            "domain": input_data.domain,
            "skill_or_subject": input_data.skill_or_subject,
            "raw_score": round(raw_score, 2),
            "proficiency_level": self._calculate_proficiency(raw_score),
            "confidence_level": "medium",
            "weak_areas": [],
            "recommendation": "Continue practicing to improve your skills."
        }
    
    def _calculate_proficiency(self, raw_score: float) -> str:
        """Calculate proficiency level from raw score"""
        if raw_score < 40:
            return "beginner"
        elif raw_score <= 70:
            return "intermediate"
        else:
            return "advanced"
    
    # ============================================
    # Database Operations
    # ============================================
    
    async def _save_assessment(
        self,
        user_id: str,
        evaluation: Dict[str, Any],
        current_phase: Optional[int],
        responses: Optional[List[Dict]]
    ) -> str:
        """Save assessment result to database"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            assessment_id = str(uuid.uuid4())
            
            # Calculate retake cooldown
            retake_available = datetime.utcnow() + timedelta(hours=self.RETAKE_COOLDOWN_HOURS)
            
            insert_data = {
                "id": assessment_id,
                "user_id": user_id,
                "domain": evaluation.get("domain"),
                "skill_or_subject": evaluation.get("skill_or_subject"),
                "raw_score": evaluation.get("raw_score", 0),
                "proficiency_level": evaluation.get("proficiency_level", "beginner"),
                "confidence_level": evaluation.get("confidence_level", "medium"),
                "weak_areas": evaluation.get("weak_areas", []),
                "recommendation": evaluation.get("recommendation"),
                "current_phase": current_phase,
                "responses_json": responses,
                "retake_available_at": retake_available.isoformat()
            }
            
            response = await client.post(
                f"{self.rest_url}/skill_assessments",
                headers=self._get_headers(),
                json=insert_data
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to save assessment: {response.text}")
            
            return assessment_id
    
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
        """Call LLM via LLMProvider with OPIK self-evaluation"""
        
        augmented_prompt = inject_opik_eval(system_prompt, agent_type="SkillAssessment")
        
        config = LLMConfig(
            model=LLMModel.GEMMA_7B.value,
            temperature=temperature,
            max_tokens=3000
        )
        
        response = await self.llm_provider.complete(
            agent_name=self.agent_name,
            system_prompt=augmented_prompt,
            user_prompt=prompt,
            config=config
        )
        
        if not response.success:
            raise Exception(f"LLM API error: {response.error}")
        
        # Parse and strip OPIK evaluation from content
        eval_result = parse_opik_eval(response.content)
        self._last_opik_eval = eval_result.get("evaluation", {})
        return eval_result["content"]
    
    def _parse_llm_response(self, response: str) -> Optional[Dict]:
        """Parse LLM response as JSON"""
        
        text = response.strip()
        
        # Remove markdown code blocks
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
            # Try to find JSON object
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

def create_skill_evaluation_agent_worker() -> SkillEvaluationAgentWorker:
    """Factory function to create SkillEvaluationAgentWorker instance"""
    return SkillEvaluationAgentWorker()
