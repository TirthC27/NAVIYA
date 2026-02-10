"""
Career Intelligence Route
Uses ResumeIntelligenceAgent logic to do deep AI analysis of resumes.
Saves results to resume_analysis + user_skills tables.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.config import settings
from app.agents.llm import call_gemini
from app.observability.opik_client import (
    start_trace, end_trace, create_span_async, log_metric, log_feedback
)
from app.llm.opik_eval_prompt import inject_opik_eval, parse_opik_eval, log_opik_eval

router = APIRouter(prefix="/api/career-intelligence", tags=["Career Intelligence"])

# ============================================
# Config
# ============================================
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

# ============================================
# Request/Response Models
# ============================================
class AnalyzeRequest(BaseModel):
    user_id: str
    domain: str = "tech"

class SkillGapRequest(BaseModel):
    user_id: str
    target_role: str = "Software Developer"

# ============================================
# LLM Prompts (from resume_intelligence_agent)
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
"""

SKILL_GAP_SYSTEM_PROMPT = """You are a career advisor AI. Analyze the user's current skills and compare them to the target role requirements.
Return ONLY valid JSON."""

# ============================================
# Helper Functions  
# ============================================
def parse_llm_json(response: str) -> Dict:
    """Parse JSON from LLM response, handling markdown code blocks"""
    cleaned = response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


def calculate_overall_score(scores: Dict[str, int], extracted_data: Dict) -> int:
    """Calculate weighted overall score with penalties"""
    weights = {
        "skill_clarity_score": 0.35,
        "project_depth_score": 0.35,
        "ats_readiness_score": 0.30
    }
    weighted_sum = sum(scores.get(k, 0) * w for k, w in weights.items())
    
    penalties = 0
    skills = extracted_data.get("skills", {})
    if not any(skills.values()) if isinstance(skills, dict) else not skills:
        penalties += 15
    if not extracted_data.get("projects"):
        penalties += 10
    if not extracted_data.get("experience"):
        penalties += 5
    
    return max(0, min(100, int(weighted_sum - penalties)))


# ============================================
# Routes
# ============================================

@router.post("/analyze")
async def analyze_resume(req: AnalyzeRequest):
    """
    Run AI deep analysis on a user's already-uploaded resume.
    Reads raw_text from resume_data, sends to LLM, saves to resume_analysis + user_skills.
    """
    user_id = req.user_id
    domain = req.domain.lower()

    if domain not in ("tech", "medical"):
        raise HTTPException(400, "Domain must be 'tech' or 'medical'")

    trace_id = start_trace(
        "CareerIntelligence_Analyze",
        metadata={"user_id": user_id, "domain": domain},
        tags=["career-intelligence", "analyze", domain]
    )

    try:
        # 1. Fetch resume raw text from resume_data
        async with httpx.AsyncClient(timeout=60.0) as client:
            url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}&select=raw_text,file_name,full_name"
            resp = await client.get(url, headers=get_headers())
            
            if resp.status_code != 200 or not resp.json():
                end_trace(trace_id, output={"error": "No resume found"}, status="error")
                raise HTTPException(404, "No resume found. Please upload your resume first.")
            
            resume_row = resp.json()[0]
            raw_text = resume_row.get("raw_text", "")
            file_name = resume_row.get("file_name", "")
        
        if not raw_text or len(raw_text.strip()) < 20:
            end_trace(trace_id, output={"error": "Resume too short"}, status="error")
            raise HTTPException(400, "Resume text is too short for analysis. Please re-upload.")

        log_metric(trace_id, "text_length", float(len(raw_text)))

        # 2. Also fetch user's career goal from onboarding (if exists)
        career_goal = ""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{SUPABASE_REST_URL}/user_context?user_id=eq.{user_id}&select=career_goal_raw"
                resp = await client.get(url, headers=get_headers())
                if resp.status_code == 200 and resp.json():
                    career_goal = resp.json()[0].get("career_goal_raw", "")
        except Exception:
            pass

        # 3. Call LLM for deep analysis
        context_parts = []
        if career_goal:
            context_parts.append(f"Career Goal: {career_goal}")
        context_str = "\n".join(context_parts) if context_parts else "No additional context."

        prompt = f"""Analyze this TECH RESUME:

{raw_text[:8000]}

---
CONTEXT:
{context_str}

---
Extract all information and provide scores. Be conservative - do not inflate scores.
Compare against career goal if provided.
Output ONLY valid JSON."""

        try:
            augmented_prompt = inject_opik_eval(TECH_RESUME_SYSTEM_PROMPT, agent_type="CareerIntelligence")
            llm_response = await call_gemini(prompt, augmented_prompt)
            eval_result = parse_opik_eval(llm_response)
            llm_response = eval_result["content"]
            opik_evaluation = eval_result["evaluation"] if eval_result["has_eval"] else None
            if opik_evaluation and trace_id:
                log_opik_eval(trace_id, opik_evaluation)
            print(f"LLM response length: {len(llm_response)}, preview: {llm_response[:200]}")
            parsed = parse_llm_json(llm_response)
            if not parsed:
                print(f"JSON parse returned empty dict. Full response: {llm_response[:500]}")
        except Exception as e:
            import traceback
            print(f"LLM analysis failed: {e}")
            traceback.print_exc()
            parsed = {
                "skills": {},
                "projects": [],
                "experience": [],
                "education": [],
                "sections_present": ["Unable to parse"],
                "scores": {"skill_clarity_score": 30, "project_depth_score": 30, "ats_readiness_score": 30},
                "missing_elements": ["Unable to fully analyze resume - LLM error"],
                "recommendations": ["Please try again or ensure resume is text-readable"],
                "confidence_level": "low"
            }

        # 4. Structure the output
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

        overall_score = calculate_overall_score(quality_scores, extracted_data)
        missing_elements = parsed.get("missing_elements", [])
        recommendations = parsed.get("recommendations", [])
        confidence_level = parsed.get("confidence_level", "medium")

        # 5. Save to resume_analysis table (upsert)
        analysis_payload = {
            "user_id": user_id,
            "domain": domain,
            "extracted_data": extracted_data,
            "quality_scores": quality_scores,
            "missing_elements": missing_elements,
            "recommendations": recommendations,
            "overall_score": overall_score,
            "confidence_level": confidence_level,
            "resume_filename": file_name,
            "word_count": len(raw_text.split()),
            "updated_at": datetime.utcnow().isoformat()
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            check_url = f"{SUPABASE_REST_URL}/resume_analysis?user_id=eq.{user_id}&select=id"
            check_resp = await client.get(check_url, headers=get_headers())
            
            if check_resp.status_code == 200 and check_resp.json():
                url = f"{SUPABASE_REST_URL}/resume_analysis?user_id=eq.{user_id}"
                resp = await client.patch(url, headers=get_headers(), json=analysis_payload)
            else:
                url = f"{SUPABASE_REST_URL}/resume_analysis"
                resp = await client.post(url, headers=get_headers(), json=analysis_payload)
            
            if resp.status_code not in (200, 201):
                print(f"Failed to save analysis: {resp.text}")

        # 6. Save individual skills to user_skills table
        skills_saved = 0
        async with httpx.AsyncClient(timeout=30.0) as client:
            del_url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}&source=eq.resume"
            await client.delete(del_url, headers=get_headers())
            
            skills_data = extracted_data.get("skills", {})
            if isinstance(skills_data, dict):
                skill_rows = []
                category_map = {
                    "languages": "language",
                    "frameworks": "framework",
                    "tools": "tool",
                    "databases": "database",
                    "cloud_devops": "cloud"
                }
                for cat_key, cat_label in category_map.items():
                    for skill_name in skills_data.get(cat_key, []):
                        if skill_name:
                            skill_rows.append({
                                "user_id": user_id,
                                "skill_name": skill_name,
                                "skill_category": cat_label,
                                "domain": domain,
                                "source": "resume"
                            })
                
                for row in skill_rows:
                    ins_url = f"{SUPABASE_REST_URL}/user_skills"
                    r = await client.post(ins_url, headers=get_headers(), json=row)
                    if r.status_code in (200, 201):
                        skills_saved += 1

        # 7. Update resume_data status to 'analyzed'
        async with httpx.AsyncClient(timeout=10.0) as client:
            status_url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
            await client.patch(status_url, headers=get_headers(), json={"status": "analyzed"})

        # 8. Log agent activity
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                log_url = f"{SUPABASE_REST_URL}/agent_activity_log"
                await client.post(log_url, headers=get_headers(), json={
                    "user_id": user_id,
                    "agent_name": "ResumeIntelligenceAgent",
                    "action": "analyze_resume",
                    "input_summary": f"Resume: {len(raw_text)} chars, domain: {domain}",
                    "output_summary": f"Score: {overall_score}/100, {skills_saved} skills extracted",
                    "metadata": {"overall_score": overall_score, "skills_saved": skills_saved}
                })
        except Exception:
            pass

        log_metric(trace_id, "overall_score", float(overall_score))
        log_metric(trace_id, "skills_saved", float(skills_saved))
        log_feedback(trace_id, "resume_analysis_quality", min(10, overall_score / 10), reason=f"Score: {overall_score}/100", evaluator="auto")

        end_trace(
            trace_id,
            output={"overall_score": overall_score, "skills_saved": skills_saved, "confidence": confidence_level},
            status="success"
        )

        result = {
            "success": True,
            "domain": domain,
            "extracted_data": extracted_data,
            "quality_scores": quality_scores,
            "missing_elements": missing_elements,
            "recommendations": recommendations,
            "overall_score": overall_score,
            "confidence_level": confidence_level,
            "skills_saved": skills_saved
        }
        if opik_evaluation:
            result["opik_eval"] = opik_evaluation
        return result

    except HTTPException:
        raise
    except Exception as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        raise


@router.get("/analysis/{user_id}")
async def get_analysis(user_id: str):
    """Get the latest AI analysis for a user"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/resume_analysis?user_id=eq.{user_id}"
        resp = await client.get(url, headers=get_headers())
        
        if resp.status_code == 200 and resp.json():
            return resp.json()[0]
    
    raise HTTPException(404, "No analysis found. Run analysis first.")


@router.get("/skills/{user_id}")
async def get_skills(user_id: str):
    """Get all extracted skills for a user"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}&order=skill_category"
        resp = await client.get(url, headers=get_headers())
        
        if resp.status_code == 200:
            return resp.json()
    
    return []


@router.post("/skill-gaps")
async def analyze_skill_gaps(req: SkillGapRequest):
    """Analyze skill gaps compared to a target role"""
    user_id = req.user_id
    target_role = req.target_role
    
    # Get user's current skills
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}"
        resp = await client.get(url, headers=get_headers())
        current_skills = resp.json() if resp.status_code == 200 else []
    
    if not current_skills:
        raise HTTPException(404, "No skills found. Upload and analyze your resume first.")
    
    skill_names = [s.get("skill_name", "") for s in current_skills]
    
    prompt = f"""The user has these skills: {', '.join(skill_names)}
They want to become a: {target_role}

Analyze the skill gap. Return ONLY valid JSON:
{{
    "target_role": "{target_role}",
    "matched_skills": ["skills the user already has that match"],
    "missing_skills": [
        {{"skill_name": "X", "importance": "critical|important|nice_to_have", "suggestion": "how to learn it"}}
    ],
    "match_percentage": 0-100,
    "career_readiness": "beginner|developing|ready|strong",
    "top_recommendations": ["actionable recommendation strings"]
}}"""
    
    try:
        augmented_prompt = inject_opik_eval(SKILL_GAP_SYSTEM_PROMPT, agent_type="SkillGapAnalysis")
        response = await call_gemini(prompt, augmented_prompt)
        eval_result = parse_opik_eval(response)
        response = eval_result["content"]
        opik_evaluation = eval_result["evaluation"] if eval_result["has_eval"] else None
        result = parse_llm_json(response)
        if opik_evaluation:
            result["opik_eval"] = opik_evaluation
    except Exception as e:
        result = {
            "target_role": target_role,
            "matched_skills": skill_names[:5],
            "missing_skills": [],
            "match_percentage": 50,
            "career_readiness": "developing",
            "top_recommendations": ["Try again later - analysis service temporarily unavailable"]
        }
    
    return result


@router.get("/activity/{user_id}")
async def get_activity_log(user_id: str):
    """Get agent activity log for a user"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/agent_activity_log?user_id=eq.{user_id}&order=created_at.desc&limit=20"
        resp = await client.get(url, headers=get_headers())
        
        if resp.status_code == 200:
            return resp.json()
    
    return []
