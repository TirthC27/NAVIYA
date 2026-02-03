"""
ResumeIntelligenceAgent - Resume/CV Analysis Agent

Purpose:
- Analyze resumes or CVs
- Extract structured information
- Evaluate quality and gaps
- Write results to database
- Update dashboard_state when complete

This agent:
- Works ONLY when a resume/CV is uploaded
- Handles ONLY resume-related intelligence

This agent MUST NOT:
- Decide domain
- Generate roadmaps
- Give career advice
- Interact with UI
- Assign tasks
"""

import httpx
import json
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.config import settings
from app.agents.worker_base import AgentWorker, TaskResult
from app.agents.llm import call_gemini
from app.llm.provider import get_llm_provider, LLMConfig, LLMModel
from app.services.dashboard_state import get_dashboard_state_service


# ============================================
# Configuration
# ============================================

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

SUPPORTED_DOMAINS = ["tech", "medical"]


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

class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TechSkills(BaseModel):
    """Tech resume skills structure"""
    languages: List[str] = []
    frameworks: List[str] = []
    tools: List[str] = []
    databases: List[str] = []
    cloud_devops: List[str] = []


class TechProject(BaseModel):
    """Tech project structure"""
    name: str
    description: str = ""
    tech_stack: List[str] = []
    outcome: Optional[str] = None


class TechExperience(BaseModel):
    """Tech experience structure"""
    title: str
    company: Optional[str] = None
    duration: Optional[str] = None
    type: str = "job"  # job, internship, freelance


class TechExtractedData(BaseModel):
    """Extracted data for tech resumes"""
    skills: TechSkills = TechSkills()
    projects: List[TechProject] = []
    experience: List[TechExperience] = []
    education: List[Dict[str, str]] = []
    sections_present: List[str] = []
    clarity_notes: str = ""


class MedicalEducation(BaseModel):
    """Medical education entry"""
    degree: str
    institution: str
    year: Optional[str] = None


class MedicalClinicalExposure(BaseModel):
    """Clinical exposure entry"""
    type: str  # rotation, internship, residency
    specialty: Optional[str] = None
    institution: Optional[str] = None
    duration: Optional[str] = None


class MedicalExam(BaseModel):
    """Medical exam entry"""
    exam_name: str
    score: Optional[str] = None
    year: Optional[str] = None


class MedicalCertification(BaseModel):
    """Medical certification entry"""
    name: str
    authority: Optional[str] = None


class MedicalResearch(BaseModel):
    """Medical research entry"""
    type: str  # publication, conference, poster
    title: Optional[str] = None
    details: Optional[str] = None


class MedicalExtractedData(BaseModel):
    """Extracted data for medical CVs"""
    education: List[MedicalEducation] = []
    clinical_exposure: List[MedicalClinicalExposure] = []
    exams: List[MedicalExam] = []
    certifications: List[MedicalCertification] = []
    research: List[MedicalResearch] = []
    sections_present: List[str] = []


class TechQualityScores(BaseModel):
    """Quality scores for tech resumes"""
    skill_clarity_score: int = 0
    project_depth_score: int = 0
    ats_readiness_score: int = 0


class MedicalQualityScores(BaseModel):
    """Quality scores for medical CVs"""
    cv_completeness_score: int = 0
    clinical_exposure_score: int = 0
    track_alignment_score: int = 0


class ResumeAnalysisOutput(BaseModel):
    """Final output schema for ResumeIntelligenceAgent"""
    domain: str
    extracted_data: Dict[str, Any]
    quality_scores: Dict[str, int]
    missing_elements: List[str]
    recommendations: List[str]
    overall_resume_score: int
    confidence_level: ConfidenceLevel


# ============================================
# LLM Prompts
# ============================================

TECH_RESUME_SYSTEM_PROMPT = """You are an expert technical resume analyzer. Your job is to extract structured information from tech resumes with precision.

RULES:
- Extract ONLY what is explicitly stated
- NEVER invent or assume skills, projects, or experience
- If something is unclear, mark it as "not specified"
- Be conservative in scoring - do not inflate scores
- Focus on technical accuracy

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "skills": {
    "languages": ["list of programming languages"],
    "frameworks": ["list of frameworks"],
    "tools": ["list of tools"],
    "databases": ["list of databases"],
    "cloud_devops": ["list of cloud/devops technologies"]
  },
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "tech_stack": ["technologies used"],
      "outcome": "measurable outcome or null"
    }
  ],
  "experience": [
    {
      "title": "role title",
      "company": "company name or null",
      "duration": "duration or null",
      "type": "job|internship|freelance"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "institution name",
      "year": "year or null"
    }
  ],
  "sections_present": ["list of sections found in resume"],
  "scores": {
    "skill_clarity_score": 0-100,
    "project_depth_score": 0-100,
    "ats_readiness_score": 0-100
  },
  "missing_elements": ["list of missing important elements"],
  "recommendations": ["list of specific recommendations"],
  "confidence_level": "low|medium|high"
}

SCORING GUIDELINES:
- skill_clarity_score: How well skills are organized and specified (penalize vague listings)
- project_depth_score: Quality and detail of project descriptions (penalize no outcomes/impact)
- ats_readiness_score: Resume format, keyword usage, structure (penalize poor formatting)

MANDATORY SECTIONS FOR TECH:
- Contact information
- Skills/Technologies
- Projects or Work Experience
- Education"""


MEDICAL_CV_SYSTEM_PROMPT = """You are an expert medical CV analyzer. Your job is to extract structured information from medical CVs with precision.

RULES:
- Extract ONLY what is explicitly stated
- NEVER invent exams, scores, or clinical experience
- If something is unclear, mark it as "not specified"
- Be conservative in scoring - do not inflate scores
- Understand medical education pathways

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "education": [
    {
      "degree": "MBBS/MD/etc",
      "institution": "medical school name",
      "year": "graduation year or null"
    }
  ],
  "clinical_exposure": [
    {
      "type": "rotation|internship|residency",
      "specialty": "specialty or null",
      "institution": "hospital/clinic name or null",
      "duration": "duration or null"
    }
  ],
  "exams": [
    {
      "exam_name": "USMLE Step 1/NEET/etc",
      "score": "score or null",
      "year": "year or null"
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "authority": "certifying body or null"
    }
  ],
  "research": [
    {
      "type": "publication|conference|poster",
      "title": "title or null",
      "details": "journal/conference name or null"
    }
  ],
  "sections_present": ["list of sections found in CV"],
  "scores": {
    "cv_completeness_score": 0-100,
    "clinical_exposure_score": 0-100,
    "track_alignment_score": 0-100
  },
  "missing_elements": ["list of missing important elements"],
  "recommendations": ["list of specific recommendations"],
  "confidence_level": "low|medium|high"
}

SCORING GUIDELINES:
- cv_completeness_score: Presence of all standard CV sections
- clinical_exposure_score: Depth and variety of clinical experience
- track_alignment_score: Alignment with stated career goals

MANDATORY SECTIONS FOR MEDICAL:
- Contact information
- Medical Education
- Clinical Experience/Rotations
- Licensing Exams (if applicable)"""


# ============================================
# ResumeIntelligenceAgent Worker Class
# ============================================

class ResumeIntelligenceAgentWorker(AgentWorker):
    """
    ResumeIntelligenceAgent - Analyzes resumes and CVs
    
    Handles task types:
    - await_resume_upload: Waiting state for resume upload
    - analyze_resume: Full analysis when resume is provided
    
    Output tables: resume_analysis, user_skills
    """
    
    SUPPORTED_TASK_TYPES = [
        "await_resume_upload",
        "analyze_resume"
    ]
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
    
    @property
    def agent_name(self) -> str:
        return "ResumeIntelligenceAgent"
    
    @property
    def supported_task_types(self) -> List[str]:
        return self.SUPPORTED_TASK_TYPES
    
    @property
    def output_tables(self) -> List[str]:
        return ["resume_analysis", "user_skills"]
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def execute(self, task_payload: Dict[str, Any]) -> TaskResult:
        """
        Execute ResumeIntelligenceAgent logic.
        
        Args:
            task_payload: Must contain user_id, domain, task_type
            
        Returns:
            TaskResult with analysis output
        """
        start_time = datetime.now()
        
        try:
            # Parse required fields
            user_id = task_payload.get("user_id")
            task_type = task_payload.get("task_type")
            domain = task_payload.get("domain", "").lower()
            task_id = task_payload.get("task_id")
            
            # Validate user_id
            if not user_id:
                return TaskResult(
                    success=False,
                    error="Missing required field: user_id",
                    summary="Validation failed"
                )
            
            # Validate task_type
            if task_type not in self.SUPPORTED_TASK_TYPES:
                return TaskResult(
                    success=False,
                    error=f"Unknown task_type: {task_type}. Supported: {self.SUPPORTED_TASK_TYPES}",
                    summary=f"Unknown task type: {task_type}"
                )
            
            # Validate domain
            if domain not in SUPPORTED_DOMAINS:
                return TaskResult(
                    success=False,
                    error=f"Invalid domain: {domain}. Must be 'tech' or 'medical'",
                    summary="Invalid domain"
                )
            
            # Initialize HTTP client if needed
            if not self.client:
                self.client = httpx.AsyncClient(timeout=60.0)
            
            # Handle await_resume_upload - just a waiting state
            if task_type == "await_resume_upload":
                return TaskResult(
                    success=True,
                    output={
                        "status": "awaiting_upload",
                        "message": "Waiting for resume/CV upload"
                    },
                    summary="Waiting for resume upload",
                    tables_updated=[]
                )
            
            # Handle analyze_resume
            if task_type == "analyze_resume":
                resume_text = task_payload.get("resume_text", "").strip()
                
                # Validate resume_text is present
                if not resume_text:
                    return TaskResult(
                        success=False,
                        error="Missing required field: resume_text for analyze_resume task",
                        summary="Resume text missing"
                    )
                
                # Get optional context
                career_goal_raw = task_payload.get("career_goal_raw", "")
                rag_context = task_payload.get("rag_context", [])
                resume_metadata = task_payload.get("resume_metadata", {})
                
                # Get extraction confidence from document ingestion
                extraction_confidence = task_payload.get("extraction_confidence", "high")
                
                # Route to domain-specific analysis
                if domain == "tech":
                    analysis = await self._analyze_tech_resume(
                        resume_text, career_goal_raw, rag_context
                    )
                else:  # medical
                    analysis = await self._analyze_medical_cv(
                        resume_text, career_goal_raw, rag_context
                    )
                
                # Adjust confidence based on extraction_confidence
                analysis = self._adjust_confidence_for_extraction(analysis, extraction_confidence)
                
                # Save to database
                saved = await self._save_analysis(
                    user_id, task_id, domain, analysis, resume_metadata
                )
                
                if not saved:
                    return TaskResult(
                        success=False,
                        error="Failed to save analysis to database",
                        summary="Database write failed"
                    )
                
                # Extract and save skills
                await self._save_skills(user_id, domain, analysis)
                
                # Update dashboard_state - resume is ready
                dashboard_service = get_dashboard_state_service()
                await dashboard_service.mark_resume_ready(user_id)
                
                # Calculate execution time
                execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                
                return TaskResult(
                    success=True,
                    output={
                        "domain": domain,
                        "extracted_data": analysis.get("extracted_data", {}),
                        "quality_scores": analysis.get("quality_scores", {}),
                        "missing_elements": analysis.get("missing_elements", []),
                        "recommendations": analysis.get("recommendations", []),
                        "overall_resume_score": analysis.get("overall_resume_score", 0),
                        "confidence_level": analysis.get("confidence_level", "medium"),
                        "extraction_confidence": extraction_confidence
                    },
                    summary=f"Analyzed {domain} resume - Score: {analysis.get('overall_resume_score', 0)}/100",
                    tables_updated=["resume_analysis", "user_skills", "dashboard_state"],
                    execution_time_ms=execution_time
                )
            
            # Should not reach here
            return TaskResult(
                success=False,
                error=f"Unhandled task_type: {task_type}",
                summary="Task type not implemented"
            )
            
        except Exception as e:
            return TaskResult(
                success=False,
                error=str(e),
                summary=f"ResumeIntelligenceAgent error: {str(e)}"
            )
    
    # ============================================
    # Confidence Adjustment
    # ============================================
    
    def _adjust_confidence_for_extraction(
        self,
        analysis: Dict[str, Any],
        extraction_confidence: str
    ) -> Dict[str, Any]:
        """
        Adjust analysis confidence based on document extraction confidence.
        
        If extraction_confidence is low (e.g., from OCR), we:
        1. Lower the overall confidence_level
        2. Add a warning to recommendations
        3. Slightly reduce overall_resume_score
        
        Args:
            analysis: The LLM-generated analysis
            extraction_confidence: 'high', 'medium', or 'low' from DocumentIngestionService
            
        Returns:
            Modified analysis dict
        """
        if extraction_confidence == "high":
            # No adjustment needed
            return analysis
        
        current_confidence = analysis.get("confidence_level", "medium")
        
        if extraction_confidence == "low":
            # Always set to low if extraction was low quality
            analysis["confidence_level"] = "low"
            
            # Add warning to recommendations
            recommendations = analysis.get("recommendations", [])
            ocr_warning = "⚠️ Resume was extracted using OCR - some information may be inaccurate. Consider uploading a text-based PDF or DOCX for better results."
            if ocr_warning not in recommendations:
                recommendations.insert(0, ocr_warning)
            analysis["recommendations"] = recommendations
            
            # Reduce overall score slightly to account for uncertainty
            current_score = analysis.get("overall_resume_score", 50)
            analysis["overall_resume_score"] = max(0, current_score - 5)
            
            # Add to missing elements
            missing = analysis.get("missing_elements", [])
            if "Extraction quality was low - some details may be missing" not in missing:
                missing.append("Extraction quality was low - some details may be missing")
            analysis["missing_elements"] = missing
            
        elif extraction_confidence == "medium":
            # Downgrade confidence by one level if not already low
            if current_confidence == "high":
                analysis["confidence_level"] = "medium"
            
            # Add a mild warning
            recommendations = analysis.get("recommendations", [])
            mild_warning = "Note: Some parts of your resume may not have been perfectly extracted. Consider uploading a cleaner format if results seem inaccurate."
            if mild_warning not in recommendations:
                recommendations.append(mild_warning)
            analysis["recommendations"] = recommendations
        
        return analysis
    
    # ============================================
    # Tech Resume Analysis
    # ============================================
    
    async def _analyze_tech_resume(
        self,
        resume_text: str,
        career_goal_raw: str,
        rag_context: List[str]
    ) -> Dict[str, Any]:
        """Analyze a tech resume using LLM"""
        
        # Build context
        context_parts = []
        if career_goal_raw:
            context_parts.append(f"Career Goal: {career_goal_raw}")
        if rag_context:
            context_parts.append("Industry Standards:\n" + "\n".join(rag_context[:3]))
        
        context_str = "\n\n".join(context_parts) if context_parts else "No additional context provided."
        
        prompt = f"""Analyze this TECH RESUME:

{resume_text}

---
CONTEXT:
{context_str}

---
Extract all information and provide scores. Be conservative - do not inflate scores.
Compare against career goal if provided.
Output ONLY valid JSON."""

        try:
            response = await call_gemini(prompt, TECH_RESUME_SYSTEM_PROMPT)
            parsed = self._parse_llm_response(response)
            
            # Structure the output
            extracted_data = {
                "skills": parsed.get("skills", {}),
                "projects": parsed.get("projects", []),
                "experience": parsed.get("experience", []),
                "education": parsed.get("education", []),
                "sections_present": parsed.get("sections_present", [])
            }
            
            scores = parsed.get("scores", {})
            quality_scores = {
                "skill_clarity_score": scores.get("skill_clarity_score", 50),
                "project_depth_score": scores.get("project_depth_score", 50),
                "ats_readiness_score": scores.get("ats_readiness_score", 50)
            }
            
            # Calculate overall score (weighted average)
            overall_score = self._calculate_tech_overall_score(quality_scores, extracted_data)
            
            return {
                "extracted_data": extracted_data,
                "quality_scores": quality_scores,
                "missing_elements": parsed.get("missing_elements", []),
                "recommendations": parsed.get("recommendations", []),
                "overall_resume_score": overall_score,
                "confidence_level": parsed.get("confidence_level", "medium")
            }
            
        except Exception as e:
            print(f"⚠️ LLM analysis failed: {e}")
            return self._get_fallback_tech_analysis(resume_text)
    
    def _calculate_tech_overall_score(
        self,
        scores: Dict[str, int],
        extracted_data: Dict
    ) -> int:
        """Calculate overall tech resume score with penalties"""
        
        # Base weighted average
        weights = {
            "skill_clarity_score": 0.35,
            "project_depth_score": 0.35,
            "ats_readiness_score": 0.30
        }
        
        weighted_sum = sum(
            scores.get(key, 0) * weight
            for key, weight in weights.items()
        )
        
        # Apply penalties for missing mandatory elements
        penalties = 0
        
        skills = extracted_data.get("skills", {})
        if not any(skills.values()):
            penalties += 15  # No skills listed
        
        if not extracted_data.get("projects"):
            penalties += 10  # No projects
        
        if not extracted_data.get("experience"):
            penalties += 5  # No experience (less penalty for fresh grads)
        
        overall = max(0, min(100, int(weighted_sum - penalties)))
        return overall
    
    def _get_fallback_tech_analysis(self, resume_text: str) -> Dict[str, Any]:
        """Fallback analysis when LLM fails"""
        word_count = len(resume_text.split())
        
        return {
            "extracted_data": {
                "skills": {},
                "projects": [],
                "experience": [],
                "education": [],
                "sections_present": ["Unable to parse"]
            },
            "quality_scores": {
                "skill_clarity_score": 30,
                "project_depth_score": 30,
                "ats_readiness_score": 30
            },
            "missing_elements": ["Unable to fully analyze resume"],
            "recommendations": ["Please ensure resume is in a clear, text-readable format"],
            "overall_resume_score": 30,
            "confidence_level": "low"
        }
    
    # ============================================
    # Medical CV Analysis
    # ============================================
    
    async def _analyze_medical_cv(
        self,
        resume_text: str,
        career_goal_raw: str,
        rag_context: List[str]
    ) -> Dict[str, Any]:
        """Analyze a medical CV using LLM"""
        
        # Build context
        context_parts = []
        if career_goal_raw:
            context_parts.append(f"Career Goal: {career_goal_raw}")
        if rag_context:
            context_parts.append("Medical Standards:\n" + "\n".join(rag_context[:3]))
        
        context_str = "\n\n".join(context_parts) if context_parts else "No additional context provided."
        
        prompt = f"""Analyze this MEDICAL CV:

{resume_text}

---
CONTEXT:
{context_str}

---
Extract all information and provide scores. Be conservative - do not inflate scores.
Compare against career goal if provided.
Output ONLY valid JSON."""

        try:
            response = await call_gemini(prompt, MEDICAL_CV_SYSTEM_PROMPT)
            parsed = self._parse_llm_response(response)
            
            # Structure the output
            extracted_data = {
                "education": parsed.get("education", []),
                "clinical_exposure": parsed.get("clinical_exposure", []),
                "exams": parsed.get("exams", []),
                "certifications": parsed.get("certifications", []),
                "research": parsed.get("research", []),
                "sections_present": parsed.get("sections_present", [])
            }
            
            scores = parsed.get("scores", {})
            quality_scores = {
                "cv_completeness_score": scores.get("cv_completeness_score", 50),
                "clinical_exposure_score": scores.get("clinical_exposure_score", 50),
                "track_alignment_score": scores.get("track_alignment_score", 50)
            }
            
            # Calculate overall score (weighted average)
            overall_score = self._calculate_medical_overall_score(quality_scores, extracted_data)
            
            return {
                "extracted_data": extracted_data,
                "quality_scores": quality_scores,
                "missing_elements": parsed.get("missing_elements", []),
                "recommendations": parsed.get("recommendations", []),
                "overall_resume_score": overall_score,
                "confidence_level": parsed.get("confidence_level", "medium")
            }
            
        except Exception as e:
            print(f"⚠️ LLM analysis failed: {e}")
            return self._get_fallback_medical_analysis(resume_text)
    
    def _calculate_medical_overall_score(
        self,
        scores: Dict[str, int],
        extracted_data: Dict
    ) -> int:
        """Calculate overall medical CV score with penalties"""
        
        # Base weighted average
        weights = {
            "cv_completeness_score": 0.40,
            "clinical_exposure_score": 0.35,
            "track_alignment_score": 0.25
        }
        
        weighted_sum = sum(
            scores.get(key, 0) * weight
            for key, weight in weights.items()
        )
        
        # Apply penalties for missing mandatory elements
        penalties = 0
        
        if not extracted_data.get("education"):
            penalties += 20  # No medical education
        
        if not extracted_data.get("clinical_exposure"):
            penalties += 15  # No clinical experience
        
        if not extracted_data.get("exams"):
            penalties += 5  # No exams (might be early stage)
        
        overall = max(0, min(100, int(weighted_sum - penalties)))
        return overall
    
    def _get_fallback_medical_analysis(self, resume_text: str) -> Dict[str, Any]:
        """Fallback analysis when LLM fails"""
        return {
            "extracted_data": {
                "education": [],
                "clinical_exposure": [],
                "exams": [],
                "certifications": [],
                "research": [],
                "sections_present": ["Unable to parse"]
            },
            "quality_scores": {
                "cv_completeness_score": 30,
                "clinical_exposure_score": 30,
                "track_alignment_score": 30
            },
            "missing_elements": ["Unable to fully analyze CV"],
            "recommendations": ["Please ensure CV is in a clear, text-readable format"],
            "overall_resume_score": 30,
            "confidence_level": "low"
        }
    
    # ============================================
    # Database Operations
    # ============================================
    
    async def _save_analysis(
        self,
        user_id: str,
        task_id: Optional[str],
        domain: str,
        analysis: Dict[str, Any],
        resume_metadata: Dict[str, Any]
    ) -> bool:
        """Save analysis to resume_analysis table (upsert)"""
        
        url = f"{SUPABASE_REST_URL}/resume_analysis"
        
        payload = {
            "user_id": user_id,
            "domain": domain,
            "extracted_data": analysis.get("extracted_data", {}),
            "quality_scores": analysis.get("quality_scores", {}),
            "missing_elements": analysis.get("missing_elements", []),
            "recommendations": analysis.get("recommendations", []),
            "overall_score": analysis.get("overall_resume_score", 0),
            "confidence_level": analysis.get("confidence_level", "medium"),
            "resume_filename": resume_metadata.get("filename"),
            "word_count": resume_metadata.get("word_count"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if task_id:
            payload["task_id"] = task_id
        
        # First try to check if record exists
        check_url = f"{url}?user_id=eq.{user_id}&select=id"
        check_response = await self.client.get(check_url, headers=get_headers())
        
        headers = get_headers()
        
        if check_response.status_code == 200 and check_response.json():
            # Record exists - update it
            update_url = f"{url}?user_id=eq.{user_id}"
            response = await self.client.patch(update_url, headers=headers, json=payload)
        else:
            # No record - insert
            response = await self.client.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            print(f"✅ Saved resume analysis for user {user_id}")
            return True
        
        print(f"❌ Failed to save analysis: {response.text}")
        return False
    
    async def _save_skills(
        self,
        user_id: str,
        domain: str,
        analysis: Dict[str, Any]
    ) -> int:
        """Extract and save skills to user_skills table"""
        
        extracted_data = analysis.get("extracted_data", {})
        skills_to_save = []
        
        if domain == "tech":
            skills = extracted_data.get("skills", {})
            
            # Languages
            for lang in skills.get("languages", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": lang,
                    "skill_category": "language",
                    "domain": domain,
                    "source": "resume"
                })
            
            # Frameworks
            for fw in skills.get("frameworks", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": fw,
                    "skill_category": "framework",
                    "domain": domain,
                    "source": "resume"
                })
            
            # Tools
            for tool in skills.get("tools", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": tool,
                    "skill_category": "tool",
                    "domain": domain,
                    "source": "resume"
                })
            
            # Databases
            for db in skills.get("databases", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": db,
                    "skill_category": "database",
                    "domain": domain,
                    "source": "resume"
                })
            
            # Cloud/DevOps
            for cloud in skills.get("cloud_devops", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": cloud,
                    "skill_category": "cloud",
                    "domain": domain,
                    "source": "resume"
                })
        
        elif domain == "medical":
            # Certifications as skills
            for cert in extracted_data.get("certifications", []):
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": cert.get("name", ""),
                    "skill_category": "certification",
                    "domain": domain,
                    "source": "resume"
                })
            
            # Exams as skills
            for exam in extracted_data.get("exams", []):
                exam_name = exam.get("exam_name", "")
                score = exam.get("score")
                name = f"{exam_name} ({score})" if score else exam_name
                skills_to_save.append({
                    "user_id": user_id,
                    "skill_name": name,
                    "skill_category": "exam",
                    "domain": domain,
                    "source": "resume"
                })
        
        if not skills_to_save:
            return 0
        
        # Delete existing resume-sourced skills
        delete_url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}&source=eq.resume"
        await self.client.delete(delete_url, headers=get_headers())
        
        # Insert new skills
        url = f"{SUPABASE_REST_URL}/user_skills"
        saved_count = 0
        
        for skill in skills_to_save:
            if skill.get("skill_name"):
                response = await self.client.post(url, headers=get_headers(), json=skill)
                if response.status_code in [200, 201]:
                    saved_count += 1
        
        print(f"✅ Saved {saved_count} skills for user {user_id}")
        return saved_count
    
    # ============================================
    # Helper Methods
    # ============================================
    
    def _parse_llm_response(self, response: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks"""
        cleaned = response.strip()
        
        # Remove markdown code blocks
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        return json.loads(cleaned)


# ============================================
# Factory Function
# ============================================

def create_resume_intelligence_agent() -> ResumeIntelligenceAgentWorker:
    """Factory function to create ResumeIntelligenceAgent instance"""
    return ResumeIntelligenceAgentWorker()
