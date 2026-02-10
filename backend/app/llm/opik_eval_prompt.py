"""
NAVIYA — Universal OPIK Self-Evaluation Prompt System

Injects a compact self-evaluation instruction into every agent's
system prompt.  After task execution the LLM produces a
[OPIK_EVALUATION] … [/OPIK_EVALUATION] block that is:
  1. Parsed into a structured dict
  2. Logged to Opik as metrics + feedback
  3. Returned to the frontend for a user-facing popup

Usage (inside any route / agent):
    from app.llm.opik_eval_prompt import (
        inject_opik_eval,
        parse_opik_eval,
        log_opik_eval,
        AGENT_FOCUS,
    )

    # 1) Wrap the system prompt
    system = inject_opik_eval(original_system_prompt, agent_type="MockInterview")

    # 2) Call LLM as usual  →  raw_response

    # 3) Split content from evaluation
    result = parse_opik_eval(raw_response)
    #   result["content"]    → cleaned agent output (no eval block)
    #   result["evaluation"] → dict with task_quality, strengths, …
    #   result["raw_eval"]   → the original text block

    # 4) Persist to Opik (optional but recommended)
    log_opik_eval(trace_id, result["evaluation"])
"""

import re
from typing import Optional, Dict, Any, List


# ============================================
# Per-Agent Evaluation Focus
# ============================================

AGENT_FOCUS: Dict[str, str] = {
    "MockInterview": "Focus on confidence, communication clarity, and depth of technical answers.",
    "Roadmap": "Focus on feasibility, timeline realism, and alignment with user's current skills.",
    "ResumeAnalyzer": "Focus on resume completeness, gap identification, and alignment with career goals.",
    "CareerIntelligence": "Focus on market relevance, skill gap accuracy, and actionability of recommendations.",
    "SkillAssessment": "Focus on question difficulty calibration, coverage of the topic, and fairness of scoring.",
    "TopicExplainer": "Focus on clarity of explanation, depth of coverage, and visual quality.",
    "Mentor": "Focus on empathy, relevance of guidance, and actionability of advice.",
    "InterviewEvaluation": "Focus on scoring accuracy, constructiveness of feedback, and improvement suggestions.",
    "SkillGapAnalysis": "Focus on accuracy of skill matching, realism of gap assessment, and priority of recommendations.",
}


# ============================================
# The Evaluation Instruction Block
# ============================================

_OPIK_EVAL_INSTRUCTION = """

--- IMPORTANT: POST-TASK SELF EVALUATION ---

After completing your main task above, you MUST append a compact
self-evaluation block at the very end of your response.

This evaluation is shown directly to the user in a popup.
Keep it short, high-signal, and non-technical.

FORMAT (use this EXACTLY — including the tags):

[OPIK_EVALUATION]

Task Quality: {High | Medium | Needs Improvement}

Key Strengths:
- {1 short, meaningful insight}
- {1 short, meaningful insight}

Confidence Level:
- {Low | Medium | High}
(Reason: 1 line max)

Alignment With Resume:
- {Well Aligned | Partially Aligned | Misaligned}

Improvement Suggestion:
- {One actionable improvement for better results}

Execution Metrics:
- Response Clarity: {1-5}
- Personalization Score: {1-5}
- Relevance Score: {1-5}

[/OPIK_EVALUATION]

STRICT RULES:
- Maximum 6 bullet points total in the evaluation
- No technical jargon (tokens, latency, embeddings, API)
- Speak like a mentor, not a system
- Never blame the user
- Be honest but encouraging
- The evaluation must reflect the actual quality of your output above
{agent_focus}
--- END EVALUATION INSTRUCTIONS ---
"""


def inject_opik_eval(
    system_prompt: str,
    agent_type: Optional[str] = None,
) -> str:
    """
    Append the OPIK self-evaluation instruction to any system prompt.

    Args:
        system_prompt: The original system / developer prompt.
        agent_type:    Key into AGENT_FOCUS for per-agent emphasis.
                       If None, no extra focus line is added.

    Returns:
        The augmented system prompt.
    """
    focus = ""
    if agent_type and agent_type in AGENT_FOCUS:
        focus = f"\n- AGENT-SPECIFIC FOCUS: {AGENT_FOCUS[agent_type]}"

    eval_block = _OPIK_EVAL_INSTRUCTION.replace("{agent_focus}", focus)
    return system_prompt.rstrip() + "\n" + eval_block


# ============================================
# Parser
# ============================================

_EVAL_RE = re.compile(
    r"\[OPIK_EVALUATION\](.*?)\[/OPIK_EVALUATION\]",
    re.DOTALL | re.IGNORECASE,
)


def parse_opik_eval(raw_response: str) -> Dict[str, Any]:
    """
    Split an LLM response into *content* and *evaluation*.

    Returns:
        {
            "content":    str   – the agent's main output (eval block removed),
            "evaluation": dict  – parsed evaluation fields (or {} on failure),
            "raw_eval":   str   – the raw text inside the tags,
            "has_eval":   bool  – whether an eval block was found,
        }
    """
    match = _EVAL_RE.search(raw_response)
    if not match:
        return {
            "content": raw_response.strip(),
            "evaluation": {},
            "raw_eval": "",
            "has_eval": False,
        }

    raw_eval = match.group(1).strip()

    # Remove the eval block from the main content
    content = raw_response[: match.start()].strip()
    # Also remove any trailing whitespace / dashes before the block
    content = re.sub(r"[\s\-]*$", "", content).strip()

    evaluation = _parse_eval_block(raw_eval)

    return {
        "content": content,
        "evaluation": evaluation,
        "raw_eval": raw_eval,
        "has_eval": True,
    }


def _parse_eval_block(text: str) -> Dict[str, Any]:
    """Parse the free-form evaluation text into a structured dict."""
    result: Dict[str, Any] = {}

    # Task Quality
    m = re.search(r"Task Quality:\s*(High|Medium|Needs Improvement)", text, re.I)
    if m:
        result["task_quality"] = m.group(1).strip()

    # Key Strengths — collect bullet lines after "Key Strengths:"
    strengths: List[str] = []
    s_block = re.search(r"Key Strengths:\s*\n((?:\s*-\s*.+\n?)+)", text, re.I)
    if s_block:
        for line in s_block.group(1).strip().splitlines():
            line = re.sub(r"^\s*-\s*", "", line).strip()
            if line:
                strengths.append(line)
    result["strengths"] = strengths

    # Confidence Level
    m = re.search(r"Confidence Level:\s*\n?\s*-?\s*(Low|Medium|High)", text, re.I)
    if m:
        result["confidence"] = m.group(1).strip()
    m_reason = re.search(r"\(Reason:\s*(.+?)\)", text, re.I)
    if m_reason:
        result["confidence_reason"] = m_reason.group(1).strip()

    # Alignment With Resume
    m = re.search(
        r"Alignment With Resume:\s*\n?\s*-?\s*(Well Aligned|Partially Aligned|Misaligned)",
        text,
        re.I,
    )
    if m:
        result["alignment"] = m.group(1).strip()

    # Improvement Suggestion
    m = re.search(r"Improvement Suggestion:\s*\n?\s*-\s*(.+)", text, re.I)
    if m:
        result["improvement"] = m.group(1).strip()

    # Execution Metrics
    metrics: Dict[str, int] = {}
    for label in ("Response Clarity", "Personalization Score", "Relevance Score"):
        m = re.search(rf"{label}:\s*(\d)", text, re.I)
        if m:
            key = label.lower().replace(" ", "_")
            metrics[key] = int(m.group(1))
    if metrics:
        result["metrics"] = metrics

    return result


# ============================================
# Opik Logging Helper
# ============================================

def log_opik_eval(trace_id: Optional[str], evaluation: Dict[str, Any]) -> None:
    """
    Persist the parsed evaluation to Opik as metrics + feedback.
    Safe to call even if Opik is in mock/disabled mode.
    """
    if not trace_id or not evaluation:
        return

    try:
        from app.observability.opik_client import log_metric, log_feedback

        # Log numeric metrics
        metrics = evaluation.get("metrics", {})
        for key, value in metrics.items():
            log_metric(trace_id, key, value)

        # Quality mapping → numeric score
        quality_map = {"High": 5.0, "Medium": 3.0, "Needs Improvement": 1.0}
        quality = evaluation.get("task_quality", "")
        if quality in quality_map:
            log_metric(trace_id, "task_quality_score", quality_map[quality])
            log_feedback(trace_id, "task_quality", quality_map[quality])

        # Confidence mapping
        conf_map = {"High": 5.0, "Medium": 3.0, "Low": 1.0}
        conf = evaluation.get("confidence", "")
        if conf in conf_map:
            log_metric(trace_id, "confidence_score", conf_map[conf])

        # Alignment mapping
        align_map = {"Well Aligned": 5.0, "Partially Aligned": 3.0, "Misaligned": 1.0}
        align = evaluation.get("alignment", "")
        if align in align_map:
            log_metric(trace_id, "alignment_score", align_map[align])

    except Exception:
        pass  # Never break the main flow for observability
