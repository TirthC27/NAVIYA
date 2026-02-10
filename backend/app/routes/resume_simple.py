"""
Resume Upload & LLM-powered Analysis
Uses the existing Agents/resume_agent (call_gemma + config.SYSTEM_PROMPT)
to extract ALL resume data via Gemini at upload time.
Stores everything in resume_data and user_skills tables.
"""

import os
import sys
import json
import asyncio
import tempfile
from typing import Optional, List, Dict, Any
from datetime import datetime
from functools import partial
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import httpx

from app.config import settings
from app.services.dashboard_state import get_dashboard_state_service
from app.observability.opik_client import (
    start_trace, end_trace, create_span_async, log_metric, log_feedback
)

# ============================================
# Import the existing resume agent
# ============================================
# Add Agents/resume_agent to sys.path so we can import it
_AGENT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Agents", "resume_agent")
_AGENT_DIR = os.path.normpath(_AGENT_DIR)
if _AGENT_DIR not in sys.path:
    sys.path.insert(0, _AGENT_DIR)

from agent import call_gemma, _extract_json   # the working agent
from resume_reader import read_pdf, read_docx  # the working file readers


router = APIRouter(prefix="/api/resume-simple", tags=["Resume Simple"])


# ============================================
# Configuration
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
# Map the agent's rich output → DB-friendly fields
# ============================================

def map_agent_output(data: dict) -> dict:
    """
    Transform the Agents/resume_agent output structure into
    the flat fields we store in resume_data + show in frontend.
    """
    contact = data.get("contact_info", {}) or {}
    prof = data.get("professional_context", {}) or {}
    caps = data.get("capabilities", {}) or {}

    # Social links
    social_links = {
        "linkedin": contact.get("linkedin") or None,
        "github": contact.get("github") or None,
        "portfolio": contact.get("portfolio_website") or None,
        "twitter": None,
        "other": [],
    }

    # Build categorised skills from capabilities
    skills_categorized = {
        "languages": [],
        "frameworks": [],
        "tools": [],
        "databases": [],
        "cloud_devops": [],
        "other": [],
    }

    # technical_proficiencies is the closest to a flat skill list
    tech_prof = caps.get("technical_proficiencies", []) or []
    # core_competencies carries richer entries
    core = caps.get("core_competencies", []) or []
    domain_exp = caps.get("domain_expertise", []) or []
    transferable = caps.get("transferable_skills", []) or []
    soft = caps.get("soft_skills_demonstrated", []) or []

    # Put tech proficiencies into "other" for now — the LLM doesn't sub-categorise them
    for item in tech_prof:
        if isinstance(item, str) and item:
            skills_categorized["other"].append(item)
    for item in domain_exp:
        if isinstance(item, str) and item:
            skills_categorized["other"].append(item)
    for item in transferable:
        if isinstance(item, str) and item:
            skills_categorized["other"].append(item)
    for entry in core:
        if isinstance(entry, dict):
            label = entry.get("normalized_label") or entry.get("capability") or ""
            if label:
                skills_categorized["other"].append(label)
        elif isinstance(entry, str) and entry:
            skills_categorized["other"].append(entry)
    # soft skills stay separate
    for item in soft:
        if isinstance(item, str) and item:
            skills_categorized["other"].append(item)

    # De-dupe
    skills_categorized["other"] = list(dict.fromkeys(skills_categorized["other"]))

    # Experience
    experience = []
    for exp in (data.get("experience_analysis", []) or []):
        experience.append({
            "title": exp.get("role", ""),
            "company": exp.get("organization", ""),
            "duration": exp.get("duration", ""),
            "start_date": exp.get("start_date"),
            "end_date": exp.get("end_date"),
            "type": "job",
            "description": ", ".join(exp.get("actions_performed", [])[:3]) if exp.get("actions_performed") else "",
        })

    # Projects
    projects = []
    for proj in (data.get("projects_and_initiatives", []) or []):
        projects.append({
            "name": proj.get("name", ""),
            "description": proj.get("description", ""),
            "tech_stack": proj.get("methods_and_tools", []) or [],
            "outcome": ", ".join(proj.get("outcomes", [])[:2]) if proj.get("outcomes") else None,
        })

    # Education
    education = []
    for edu in (data.get("education", []) or []):
        education.append({
            "degree": edu.get("degree", ""),
            "field_of_study": edu.get("field_of_study"),
            "institution": edu.get("institution", ""),
            "year": edu.get("graduation_date"),
            "honors": ", ".join(edu.get("honors_distinctions", [])) if edu.get("honors_distinctions") else None,
        })

    # Certifications
    certifications = []
    for cert in (data.get("certifications_and_credentials", []) or []):
        certifications.append({
            "name": cert.get("credential", ""),
            "issuer": cert.get("issuing_body"),
            "date": cert.get("date_obtained"),
        })

    # Achievements / Awards
    achievements = []
    for award in (data.get("awards_and_recognition", []) or []):
        achievements.append(award.get("award", str(award)))

    # Summary
    summary = prof.get("career_summary") or ""

    return {
        "contact": contact,
        "social_links": social_links,
        "skills_categorized": skills_categorized,
        "experience": experience,
        "projects": projects,
        "education": education,
        "certifications": certifications,
        "achievements": achievements,
        "summary": summary,
        "professional_context": prof,
    }


def flatten_skills(skills_dict: Dict) -> List[str]:
    """Flatten categorized skills dict into a single sorted list"""
    all_skills = []
    if isinstance(skills_dict, dict):
        for category, skill_list in skills_dict.items():
            if isinstance(skill_list, list):
                all_skills.extend(s for s in skill_list if isinstance(s, str))
    return sorted(list(set(all_skills)))


# ============================================
# Routes
# ============================================

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Upload resume (PDF/DOCX), extract ALL data via the existing
    Agents/resume_agent (call_gemma -> Gemini Flash).
    Stores name, skills, social links, experience, projects, education, etc.
    Also populates user_skills table for immediate career view.
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.lower().split(".")[-1]
    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")

    if ext == "doc":
        ext = "docx"

    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    # Start Opik trace for resume analysis
    trace_id = start_trace(
        "ResumeAnalysis",
        metadata={"user_id": user_id, "filename": file.filename, "file_size": len(content)},
        tags=["resume", "upload", "analysis"]
    )

    try:
        # ── 1. Extract raw text using existing agent's readers ──
        if ext == "pdf":
            raw_text = read_pdf(tmp_path)
        elif ext in ("docx", "doc"):
            raw_text = read_docx(tmp_path)
        else:
            raw_text = open(tmp_path, "r", encoding="utf-8", errors="ignore").read()

        if len(raw_text.strip()) < 20:
            end_trace(trace_id, output={"error": "Insufficient text"}, status="error")
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from file. Please ensure the file is readable."
            )

        log_metric(trace_id, "text_length", len(raw_text))

        # ── 2. Call existing resume agent (sync → run in executor) ──
        llm_raw: dict = {}
        async with create_span_async(trace_id, "LLM_Analysis", span_type="llm", input_data={"text_length": len(raw_text)}) as llm_span:
            try:
                loop = asyncio.get_event_loop()
                llm_raw = await loop.run_in_executor(None, call_gemma, raw_text)
                print(f"[Resume Agent] Extracted keys: {list(llm_raw.keys())}")
                llm_span.set_output({"keys": list(llm_raw.keys()), "success": True})
            except Exception as e:
                print(f"[Resume Agent] call_gemma failed: {e}")
                llm_span.set_output({"error": str(e), "success": False})
                llm_raw = {}

        # ── Extract OPIK self-evaluation if present ──
        opik_eval = llm_raw.pop("_opik_eval", None) or {}

        # ── 3. Map agent output → DB-friendly structure ──
        mapped = map_agent_output(llm_raw)

        contact = mapped["contact"]
        social_links = mapped["social_links"]
        skills_categorized = mapped["skills_categorized"]
        experience = mapped["experience"]
        projects = mapped["projects"]
        education = mapped["education"]
        certifications = mapped["certifications"]
        achievements = mapped["achievements"]
        summary = mapped["summary"]

        flat_skills = flatten_skills(skills_categorized)

        # Name: agent first, then fallback heuristic
        name = contact.get("full_name")
        if not name:
            for line in raw_text.strip().split("\n")[:5]:
                line = line.strip()
                if 3 < len(line) < 60 and "@" not in line and "http" not in line:
                    words = line.split()
                    if 2 <= len(words) <= 4:
                        name = line
                        break

        status = "analyzed" if llm_raw else "parsed"

        log_metric(trace_id, "skills_count", len(flat_skills))
        log_metric(trace_id, "status", 1.0 if status == "analyzed" else 0.0)

        # ── 4. Build DB payload ──
        data = {
            "user_id": user_id,
            "full_name": name,
            "email": contact.get("email"),
            "phone": contact.get("phone"),
            "location": contact.get("location"),
            "social_links": social_links,
            "llm_extracted_data": llm_raw,
            "skills": flat_skills,
            "experience": experience,
            "projects": projects,
            "education": education,
            "certifications": certifications,
            "achievements": achievements,
            "raw_text": raw_text[:10000],
            "file_name": file.filename,
            "file_size_bytes": len(content),
            "total_skills": len(flat_skills),
            "status": status,
            "parsed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # ── 5. Upsert to resume_data ──
        async with create_span_async(trace_id, "DB_Save", span_type="tool", input_data={"user_id": user_id}) as db_span:
          async with httpx.AsyncClient(timeout=60.0) as client:
            check_url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
            check_response = await client.get(check_url, headers=get_headers())

            if check_response.status_code == 200 and check_response.json():
                url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
                response = await client.patch(url, headers=get_headers(), json=data)
            else:
                url = f"{SUPABASE_REST_URL}/resume_data"
                response = await client.post(url, headers=get_headers(), json=data)

            if response.status_code not in [200, 201]:
                print(f"[Resume DB] Save failed: {response.text}")
                db_span.set_output({"error": response.text})
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save to database. Please check Supabase configuration."
                )
            db_span.set_output({"success": True})

        # ── 6. Populate user_skills table ──
        skills_saved = 0
        if skills_categorized and isinstance(skills_categorized, dict):
            async with httpx.AsyncClient(timeout=30.0) as client:
                del_url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}&source=eq.resume"
                await client.delete(del_url, headers=get_headers())

                category_map = {
                    "languages": "language",
                    "frameworks": "framework",
                    "tools": "tool",
                    "databases": "database",
                    "cloud_devops": "cloud",
                    "other": "other"
                }

                for cat_key, cat_label in category_map.items():
                    for skill_name in skills_categorized.get(cat_key, []):
                        if skill_name and isinstance(skill_name, str):
                            r = await client.post(
                                f"{SUPABASE_REST_URL}/user_skills",
                                headers=get_headers(),
                                json={
                                    "user_id": user_id,
                                    "skill_name": skill_name,
                                    "skill_category": cat_label,
                                    "domain": "tech",
                                    "source": "resume"
                                }
                            )
                            if r.status_code in (200, 201):
                                skills_saved += 1

        # ── 7. Save to resume_analysis (for career-intelligence compat) ──
        if llm_raw:
            quality_scores = {
                "skill_clarity_score": 70 if flat_skills else 30,
                "project_depth_score": 70 if projects else 30,
                "ats_readiness_score": 60
            }
            overall_score = int(
                quality_scores["skill_clarity_score"] * 0.35 +
                quality_scores["project_depth_score"] * 0.35 +
                quality_scores["ats_readiness_score"] * 0.30
            )

            analysis_payload = {
                "user_id": user_id,
                "domain": "tech",
                "extracted_data": {
                    "skills": skills_categorized,
                    "projects": projects,
                    "experience": experience,
                    "education": education,
                    "sections_present": list(llm_raw.keys())
                },
                "quality_scores": quality_scores,
                "missing_elements": [],
                "recommendations": [],
                "overall_score": overall_score,
                "confidence_level": "high" if len(raw_text) > 500 else "medium",
                "resume_filename": file.filename,
                "word_count": len(raw_text.split()),
                "updated_at": datetime.utcnow().isoformat()
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                check_url = f"{SUPABASE_REST_URL}/resume_analysis?user_id=eq.{user_id}&select=id"
                check_resp = await client.get(check_url, headers=get_headers())

                if check_resp.status_code == 200 and check_resp.json():
                    url = f"{SUPABASE_REST_URL}/resume_analysis?user_id=eq.{user_id}"
                    await client.patch(url, headers=get_headers(), json=analysis_payload)
                else:
                    url = f"{SUPABASE_REST_URL}/resume_analysis"
                    await client.post(url, headers=get_headers(), json=analysis_payload)

        # ── 8. Update dashboard state (unlock all features) ──
        if llm_raw:  # Only if LLM extraction succeeded
            try:
                dashboard_service = get_dashboard_state_service()
                await dashboard_service.mark_resume_ready(user_id)
                print(f"[Resume Upload] Dashboard state updated: resume_ready=true")
            except Exception as e:
                print(f"[Resume Upload] Failed to update dashboard state: {e}")

        # ── 9. Log activity ──
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{SUPABASE_REST_URL}/agent_activity_log",
                    headers=get_headers(),
                    json={
                        "user_id": user_id,
                        "agent_name": "ResumeUploadAgent",
                        "action": "upload_and_analyze",
                        "input_summary": f"File: {file.filename}, {len(raw_text)} chars",
                        "output_summary": f"Name: {name}, {len(flat_skills)} skills, {skills_saved} saved",
                        "metadata": {
                            "skills_count": len(flat_skills),
                            "has_social_links": bool(any(v for v in social_links.values() if v and v != [])),
                            "status": status
                        }
                    }
                )
        except Exception:
            pass

        # Score the resume quality for Opik feedback
        resume_score = min(10, max(1, len(flat_skills) / 3))
        log_feedback(trace_id, "resume_quality", resume_score, reason=f"{len(flat_skills)} skills extracted", evaluator="auto")
        log_metric(trace_id, "execution_time_ms", 0)  # will be overridden by trace duration

        end_trace(
            trace_id,
            output={"skills_count": len(flat_skills), "status": status, "name": name},
            status="success"
        )

        return {
            "success": True,
            "name": name,
            "email": contact.get("email"),
            "phone": contact.get("phone"),
            "location": contact.get("location"),
            "social_links": social_links,
            "skills": flat_skills,
            "skills_categorized": skills_categorized,
            "skills_count": len(flat_skills),
            "experience": experience,
            "projects": projects,
            "education": education,
            "certifications": certifications,
            "achievements": achievements,
            "summary": summary,
            "status": status,
            "message": f"Resume uploaded and analyzed! Found {len(flat_skills)} skills via AI."
                if llm_raw else "Resume uploaded. Text extracted but AI analysis unavailable.",
            "opik_eval": opik_eval if opik_eval else None
        }

    except HTTPException:
        end_trace(trace_id, output={"error": "HTTP error"}, status="error")
        raise
    except Exception as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        raise
    finally:
        os.unlink(tmp_path)


@router.get("/data/{user_id}")
async def get_resume(user_id: str):
    """Get resume data including LLM-extracted info, skills, and social links"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
        response = await client.get(url, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            if data:
                return data[0]
        
        raise HTTPException(404, "No resume found")


@router.get("/career/{user_id}")
async def get_career_data(user_id: str):
    """
    Get combined career data: resume info + categorized skills.
    Replaces the need for a separate career-intelligence/analyze call.
    """
    resume_data = None
    skills = []
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
        resp = await client.get(url, headers=get_headers())
        if resp.status_code == 200 and resp.json():
            resume_data = resp.json()[0]
        
        url = f"{SUPABASE_REST_URL}/user_skills?user_id=eq.{user_id}&order=skill_category"
        resp = await client.get(url, headers=get_headers())
        if resp.status_code == 200:
            skills = resp.json()
    
    if not resume_data:
        raise HTTPException(404, "No resume found. Please upload your resume first.")
    
    return {
        "resume": resume_data,
        "skills": skills,
        "has_analysis": resume_data.get("status") == "analyzed"
    }


class UpdateSocialLinksRequest(BaseModel):
    social_links: Dict[str, Any]


@router.patch("/social-links/{user_id}")
async def update_social_links(user_id: str, req: UpdateSocialLinksRequest):
    """
    Update social links for a user.
    Used when social links were not found in resume and user edits them manually.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/resume_data?user_id=eq.{user_id}"
        resp = await client.patch(
            url,
            headers=get_headers(),
            json={"social_links": req.social_links}
        )
        
        if resp.status_code in (200, 201):
            result = resp.json()
            return {"success": True, "social_links": result[0].get("social_links") if result else req.social_links}
        
        raise HTTPException(500, "Failed to update social links")
