"""
Skill Assessment API Routes (Scenario-based)
Thin routing layer → delegates to SkillAssessmentAgent
"""

import sys
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add Agents directory to path
agents_path = Path(__file__).parent.parent.parent / "Agents"
if str(agents_path) not in sys.path:
    sys.path.insert(0, str(agents_path))

from app.config import settings
from skill_assessment_agent import SkillAssessmentAgent

router = APIRouter(prefix="/api/skill-assessment", tags=["Skill Assessment (Scenarios)"])

agent = SkillAssessmentAgent(
    supabase_url=settings.SUPABASE_URL,
    supabase_key=settings.SUPABASE_KEY,
)


# ── Request Models ──────────────────────────────────────

class StartRequest(BaseModel):
    user_id: str
    domain: str  # tech / business / law
    skill: str


class SubmitActionsRequest(BaseModel):
    user_id: str
    domain: str
    skill: str
    scenario: Dict[str, Any]
    actions: List[Dict[str, Any]]  # [{ action_id, order, timestamp }]
    time_taken_seconds: int = 0


class ExplainRequest(BaseModel):
    user_id: str
    domain: str
    skill: str
    scenario: Dict[str, Any]
    actions: List[Dict[str, Any]]
    scores: Dict[str, Any]
    explanation: str
    time_taken_seconds: int = 0


# ── Endpoints ───────────────────────────────────────────

@router.get("/domains")
async def get_domains():
    """Get available domains and their skills."""
    domains = []
    for key, label in agent.DOMAINS.items():
        skills = agent.get_domain_skills(key)
        domains.append({"id": key, "label": label, "skills": skills})
    return {"success": True, "domains": domains}


@router.post("/start")
async def start_assessment(req: StartRequest):
    """
    STEP 1-3: Load rules + Generate scenario.
    Returns the scenario for the user to play.
    """
    if req.domain not in agent.DOMAINS:
        raise HTTPException(400, f"Invalid domain: {req.domain}")

    try:
        scenario = await agent.generate_scenario(req.domain, req.skill)
        # Strip hidden info before sending to frontend
        safe_scenario = {**scenario}
        safe_scenario.pop("hidden_info", None)
        safe_scenario.pop("rule_mappings", None)
        safe_scenario.pop("optimal_order", None)
        safe_scenario.pop("critical_actions", None)

        return {
            "success": True,
            "scenario": safe_scenario,
            # Keep full scenario server-side reference
            "_full_scenario": scenario,
        }
    except Exception as e:
        print(f"[Assessment] Start error: {e}")
        raise HTTPException(500, f"Failed to generate scenario: {str(e)}")


@router.post("/score")
async def score_assessment(req: SubmitActionsRequest):
    """
    STEP 5: Auto-score user actions. Pure logic, no LLM.
    """
    try:
        scores = agent.score_user_actions(
            user_actions=req.actions,
            scenario=req.scenario,
            domain=req.domain,
            time_taken_seconds=req.time_taken_seconds,
        )
        return {"success": True, "scores": scores}
    except Exception as e:
        print(f"[Assessment] Score error: {e}")
        raise HTTPException(500, f"Scoring failed: {str(e)}")


@router.post("/explain")
async def explain_and_finalize(req: ExplainRequest):
    """
    STEP 6-7: Evaluate explanation + save final result.
    """
    try:
        # Evaluate explanation with LLM
        explanation_eval = await agent.evaluate_explanation(
            explanation=req.explanation,
            scenario=req.scenario,
            user_actions=req.actions,
            scores=req.scores,
        )

        # Merge explanation scores into action scores
        final_scores = {**req.scores, "explanation": explanation_eval}

        # Adjust total with explanation quality
        exp_avg = (
            explanation_eval.get("logical_coherence", 50)
            + explanation_eval.get("self_awareness", 50)
            + explanation_eval.get("ethical_consideration", 50)
        ) / 3
        # Explanation can adjust total by up to ±10 points
        adjustment = (exp_avg - 50) / 5  # range: -10 to +10
        final_scores["total"] = max(0, min(100, round(req.scores.get("total", 50) + adjustment)))
        final_scores["grade"] = (
            "A" if final_scores["total"] >= 85 else
            "B" if final_scores["total"] >= 70 else
            "C" if final_scores["total"] >= 55 else
            "D" if final_scores["total"] >= 40 else "F"
        )

        # Save to DB
        assessment_id = await agent.save_assessment(
            user_id=req.user_id,
            domain=req.domain,
            skill=req.skill,
            scenario=req.scenario,
            user_actions=req.actions,
            scores=final_scores,
            explanation=req.explanation,
            time_taken=req.time_taken_seconds,
        )

        return {
            "success": True,
            "scores": final_scores,
            "assessment_id": assessment_id,
            "explanation_feedback": explanation_eval.get("feedback", ""),
        }
    except Exception as e:
        print(f"[Assessment] Explain error: {e}")
        raise HTTPException(500, f"Evaluation failed: {str(e)}")


@router.get("/history/{user_id}")
async def get_assessment_history(user_id: str):
    """Get assessment history for a user."""
    history = await agent.get_history(user_id)
    return {"success": True, "history": history}
