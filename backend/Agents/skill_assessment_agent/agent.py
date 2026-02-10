"""
Skill Assessment Agent — Core Logic

Pipeline:
  1. Load rules (core + domain)
  2. LLM generates scenario (controlled via template)
  3. User plays (frontend handles)
  4. Auto-score actions against rules (pure logic)
  5. LLM evaluates explanation (bounded rubric)
  6. Final skill profile
"""

import json
import uuid
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import httpx

from .scoring import score_actions

try:
    from app.observability.opik_client import (
        init_opik, start_trace, end_trace,
        create_span_async, log_metric, log_feedback,
    )
    OPIK_AVAILABLE = True
except Exception:
    OPIK_AVAILABLE = False

RULES_DIR = Path(__file__).parent / "rules"


class SkillAssessmentAgent:
    """Scenario-based skill assessment agent."""

    # Categories for scoring radar
    SCORE_CATEGORIES = [
        "decision_quality",
        "risk_awareness",
        "communication",
        "ethical_reasoning",
        "stress_behavior",
    ]

    DOMAINS = {
        "tech": "Technology",
        "business": "Business",
        "law": "Law",
    }

    def __init__(self, supabase_url: str = "", supabase_key: str = ""):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase_rest = f"{supabase_url}/rest/v1" if supabase_url else ""
        self._rules_cache: Dict[str, List[Dict]] = {}

    def _get_headers(self) -> Dict[str, str]:
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    # ── STEP 2: Load Rules ──────────────────────────────────

    def load_core_rules(self) -> List[Dict]:
        """Load universal thinking rules (cached)."""
        if "core" in self._rules_cache:
            return self._rules_cache["core"]
        path = RULES_DIR / "core_rules.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        rules = data.get("rules", [])
        self._rules_cache["core"] = rules
        return rules

    def load_domain_rules(self, domain: str) -> List[Dict]:
        """Load domain-specific rule pack (cached)."""
        if domain in self._rules_cache:
            return self._rules_cache[domain]
        path = RULES_DIR / f"{domain}_rules.json"
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        rules = data.get("rules", [])
        self._rules_cache[domain] = rules
        return rules

    def get_domain_skills(self, domain: str) -> List[str]:
        """Get available skills for a domain."""
        path = RULES_DIR / f"{domain}_rules.json"
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("skills", [])

    # ── STEP 3: Generate Scenario (LLM, controlled) ─────────

    async def generate_scenario(self, domain: str, skill: str) -> Dict:
        """
        Call LLM to generate a scenario following our template.
        LLM can only add flavor & choose actions — NOT invent rules.
        """
        from app.agents.llm import call_gemini

        trace_id = None
        t0 = time.time()
        if OPIK_AVAILABLE:
            try:
                trace_id = start_trace(
                    "SkillAssessment_GenerateScenario",
                    input={"domain": domain, "skill": skill},
                    metadata={"agent": "skill_assessment", "operation": "generate_scenario"},
                )
            except Exception:
                trace_id = None

        core_rules = self.load_core_rules()
        domain_rules = self.load_domain_rules(domain)
        all_rule_ids = [r["id"] for r in core_rules + domain_rules]
        rules_text = "\n".join(
            f"- {r['id']}: {r['label']}" for r in core_rules + domain_rules
        )

        system_prompt = f"""You are a scenario designer for skill assessments.
You MUST generate a realistic workplace scenario that tests: "{skill}" in the "{domain}" domain.

AVAILABLE RULES (you can ONLY reference these rule IDs):
{rules_text}

You MUST return ONLY valid JSON with this EXACT structure:
{{
  "context": "2-3 sentence situation description",
  "urgency": "high" or "medium" or "low",
  "time_limit_seconds": 90 to 180,
  "background_info": "Partial info the user sees before acting",
  "hidden_info": "Info revealed after actions are taken",
  "available_actions": [
    {{
      "id": "action_1",
      "label": "Short action description (max 12 words)",
      "category": "investigate" or "communicate" or "execute" or "escalate" or "defer",
      "risk_level": "low" or "medium" or "high",
      "hidden_consequence": "What happens if picked"
    }}
  ],
  "optimal_order": ["action_X", "action_Y", ...],
  "critical_actions": ["action_X"],
  "rule_mappings": {{
    "action_1": {{
      "rules_followed": ["rule_id"],
      "rules_violated": ["rule_id"]
    }}
  }}
}}

CONSTRAINTS:
- Exactly 5-7 available_actions
- Each action must map to at least 1 rule (followed or violated)
- Only use rule IDs from the list above
- optimal_order should be 3-5 actions (the best path)
- critical_actions: 1-2 actions that MUST be taken
- Make the scenario realistic, specific, with partial information
- Add moral/ethical tension when possible
- Return ONLY valid JSON, no markdown"""

        prompt = f"""Domain: {domain}
Skill being tested: {skill}

Generate a challenging scenario now."""

        response = await call_gemini(prompt, system_prompt)
        if OPIK_AVAILABLE and trace_id:
            try:
                await create_span_async(trace_id, "LLM_ScenarioGeneration", input={"domain": domain, "skill": skill}, output={"response_length": len(response)})
            except Exception:
                pass
        scenario = self._parse_json(response)

        if not scenario or "available_actions" not in scenario:
            if OPIK_AVAILABLE and trace_id:
                try:
                    end_trace(trace_id, output={"error": "invalid_scenario"}, status="error")
                except Exception:
                    pass
            raise ValueError("LLM failed to generate valid scenario")

        # Validate rule_mappings only reference real rules
        mappings = scenario.get("rule_mappings", {})
        for action_id, mapping in mappings.items():
            mapping["rules_followed"] = [r for r in mapping.get("rules_followed", []) if r in all_rule_ids]
            mapping["rules_violated"] = [r for r in mapping.get("rules_violated", []) if r in all_rule_ids]

        scenario["scenario_id"] = f"scenario_{uuid.uuid4().hex[:8]}"
        scenario["domain"] = domain
        scenario["skill"] = skill

        if OPIK_AVAILABLE and trace_id:
            try:
                duration_ms = (time.time() - t0) * 1000
                log_metric(trace_id, "scenario_actions_count", float(len(scenario.get("available_actions", []))))
                log_metric(trace_id, "generation_time_ms", duration_ms)
                log_feedback(trace_id, "scenario_quality", 1.0, "generated", "system")
                end_trace(trace_id, output={"scenario_id": scenario["scenario_id"], "actions": len(scenario.get("available_actions", []))}, status="success")
            except Exception:
                pass

        return scenario

    # ── STEP 5: Auto-Score (pure logic) ─────────────────────

    def score_user_actions(
        self,
        user_actions: List[Dict],
        scenario: Dict,
        domain: str,
        time_taken_seconds: int = 0,
    ) -> Dict:
        """Score user actions against rule packs. No LLM."""
        core_rules = self.load_core_rules()
        domain_rules = self.load_domain_rules(domain)
        return score_actions(user_actions, scenario, core_rules, domain_rules, time_taken_seconds)

    # ── STEP 6: Evaluate Explanation (LLM, bounded) ─────────

    async def evaluate_explanation(
        self, explanation: str, scenario: Dict, user_actions: List[Dict], scores: Dict
    ) -> Dict:
        """LLM evaluates user's explanation against fixed rubric. Returns bounded scores."""
        from app.agents.llm import call_gemini

        trace_id = None
        t0 = time.time()
        if OPIK_AVAILABLE:
            try:
                trace_id = start_trace(
                    "SkillAssessment_EvaluateExplanation",
                    input={"explanation_length": len(explanation), "scenario_id": scenario.get("scenario_id", ""), "actions_count": len(user_actions)},
                    metadata={"agent": "skill_assessment", "operation": "evaluate_explanation"},
                )
            except Exception:
                trace_id = None

        actions_text = ", ".join(a["action_id"] for a in user_actions)
        context = scenario.get("context", "")

        system_prompt = """You are evaluating a user's explanation of their decision-making.

Score EACH dimension 0-100 based on the explanation quality:

1. logical_coherence: Does the reasoning make logical sense?
2. self_awareness: Does the user recognize tradeoffs and limitations?
3. ethical_consideration: Does the user show awareness of ethical implications?

Return ONLY valid JSON:
{
  "logical_coherence": 0-100,
  "self_awareness": 0-100,
  "ethical_consideration": 0-100,
  "feedback": "1-2 sentence constructive feedback"
}

Be fair but strict. Return ONLY JSON."""

        prompt = f"""Scenario: {context}

Actions taken: {actions_text}

User's explanation:
"{explanation}"

Evaluate now."""

        response = await call_gemini(prompt, system_prompt)
        if OPIK_AVAILABLE and trace_id:
            try:
                await create_span_async(trace_id, "LLM_ExplanationEval", input={"explanation_length": len(explanation)}, output={"response_length": len(response)})
            except Exception:
                pass
        eval_data = self._parse_json(response)

        if not eval_data:
            if OPIK_AVAILABLE and trace_id:
                try:
                    end_trace(trace_id, output={"error": "parse_failed"}, status="error")
                except Exception:
                    pass
            return {
                "logical_coherence": 50,
                "self_awareness": 50,
                "ethical_consideration": 50,
                "feedback": "Could not evaluate explanation.",
            }

        # Clamp scores to 0-100
        for key in ["logical_coherence", "self_awareness", "ethical_consideration"]:
            val = eval_data.get(key, 50)
            eval_data[key] = max(0, min(100, int(val)))

        if OPIK_AVAILABLE and trace_id:
            try:
                duration_ms = (time.time() - t0) * 1000
                avg_score = sum(eval_data.get(k, 0) for k in ["logical_coherence", "self_awareness", "ethical_consideration"]) / 3
                log_metric(trace_id, "logical_coherence", float(eval_data["logical_coherence"]))
                log_metric(trace_id, "self_awareness", float(eval_data["self_awareness"]))
                log_metric(trace_id, "ethical_consideration", float(eval_data["ethical_consideration"]))
                log_metric(trace_id, "evaluation_time_ms", duration_ms)
                log_feedback(trace_id, "explanation_quality", avg_score / 100, eval_data.get("feedback", ""), "llm-judge")
                end_trace(trace_id, output=eval_data, status="success")
            except Exception:
                pass

        return eval_data

    # ── DB Operations ───────────────────────────────────────

    async def save_assessment(
        self,
        user_id: str,
        domain: str,
        skill: str,
        scenario: Dict,
        user_actions: List[Dict],
        scores: Dict,
        explanation: str = "",
        time_taken: int = 0,
    ) -> Optional[str]:
        """Save completed assessment to DB. Returns assessment ID."""
        if not self.supabase_rest:
            return None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                payload = {
                    "user_id": user_id,
                    "domain": domain,
                    "skill": skill,
                    "scenario_id": scenario.get("scenario_id", ""),
                    "scenario_data": scenario,
                    "user_actions": user_actions,
                    "user_explanation": explanation,
                    "scores": scores,
                    "total_score": scores.get("total", 0),
                    "time_taken_seconds": time_taken,
                    "completed": True,
                    "completed_at": datetime.utcnow().isoformat(),
                }
                resp = await client.post(
                    f"{self.supabase_rest}/skill_assessment",
                    headers=self._get_headers(),
                    json=payload,
                )
                if resp.status_code in (200, 201) and resp.json():
                    return resp.json()[0].get("id")
                print(f"[Assessment] DB save: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            print(f"[Assessment] DB save FAILED: {e}")
        return None

    async def get_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get assessment history for a user."""
        if not self.supabase_rest:
            return []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = (
                    f"{self.supabase_rest}/skill_assessment"
                    f"?user_id=eq.{user_id}&completed=eq.true"
                    f"&order=completed_at.desc&limit={limit}"
                    f"&select=id,domain,skill,total_score,scores,time_taken_seconds,completed_at"
                )
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            print(f"[Assessment] History fetch error: {e}")
        return []

    # ── Helpers ─────────────────────────────────────────────

    @staticmethod
    def _parse_json(text: str) -> Dict:
        import re
        cleaned = text.strip()
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
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
        return {}
