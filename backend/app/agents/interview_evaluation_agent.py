"""
InterviewEvaluationAgent

Evaluates mock interview transcripts using LLM.
Analyzes each Q&A pair, scores responses, identifies weaknesses,
and provides an overall interview rating.

This agent:
- Receives transcribed interview text (interviewer + candidate segments)
- Evaluates answer quality per question
- Rates the overall interview session
- Provides actionable feedback
- Updates dashboard_state after evaluation

This agent MUST NOT:
- Generate roadmaps
- Modify resume data
- Teach concepts directly
"""

import json
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.config import settings
from app.agents.llm import call_gemini, LLMError
from app.observability.opik_client import (
    start_trace, end_trace, create_span_async, log_metric, log_feedback
)
from app.llm.opik_eval_prompt import inject_opik_eval, parse_opik_eval, log_opik_eval


# ============================================
# Schemas
# ============================================

class InterviewSegment(BaseModel):
    """A single segment from the transcript"""
    speaker: str  # "INTERVIEWER" or "CANDIDATE"
    text: str
    start: Optional[float] = None
    end: Optional[float] = None


class QAEvaluation(BaseModel):
    """Evaluation of a single Q&A pair"""
    question: str
    candidate_answer: str
    quality_score: int = Field(..., ge=0, le=10)
    ideal_answer_summary: str
    feedback: str
    strengths: List[str] = []
    improvements: List[str] = []


class InterviewEvaluation(BaseModel):
    """Complete interview evaluation result"""
    session_id: str
    user_id: str
    overall_score: int = Field(..., ge=0, le=100)
    overall_rating: str  # "Poor", "Below Average", "Average", "Good", "Excellent"
    total_questions: int
    questions_evaluated: int
    qa_evaluations: List[QAEvaluation]
    strengths_summary: List[str]
    improvement_areas: List[str]
    communication_score: int = Field(..., ge=0, le=10)
    technical_score: int = Field(..., ge=0, le=10)
    confidence_score: int = Field(..., ge=0, le=10)
    recommendation: str
    evaluated_at: str
    opik_eval: Optional[Dict[str, Any]] = None


# ============================================
# System Prompt
# ============================================

INTERVIEW_EVAL_SYSTEM_PROMPT = """You are an expert Interview Evaluation Agent.

You analyze mock interview transcripts and evaluate the candidate's performance.

INPUT: A transcript with labeled speakers (INTERVIEWER and CANDIDATE).

YOUR TASK:
1. Identify each question asked by the INTERVIEWER
2. Match it with the CANDIDATE's response
3. Evaluate each response on quality, depth, relevance, and accuracy
4. Rate communication clarity, technical depth, and confidence
5. Provide an overall interview rating

SCORING RULES:
- Each Q&A pair gets a quality_score from 0-10
- communication_score (0-10): Clarity, structure, conciseness
- technical_score (0-10): Accuracy, depth of knowledge shown
- confidence_score (0-10): Assertiveness, fluency, composure
- overall_score (0-100): Weighted combination

RATING SCALE:
- 0-20: "Poor"
- 21-40: "Below Average"
- 41-60: "Average"
- 61-80: "Good"
- 81-100: "Excellent"

For each Q&A pair, provide:
- The ideal answer summary (what a strong candidate would say)
- Specific strengths in the candidate's answer
- Specific improvements needed

OUTPUT FORMAT - JSON ONLY (no markdown, no backticks):
{
  "overall_score": number,
  "overall_rating": "string",
  "communication_score": number,
  "technical_score": number,
  "confidence_score": number,
  "qa_evaluations": [
    {
      "question": "string",
      "candidate_answer": "string",
      "quality_score": number,
      "ideal_answer_summary": "string",
      "feedback": "string",
      "strengths": ["string"],
      "improvements": ["string"]
    }
  ],
  "strengths_summary": ["string"],
  "improvement_areas": ["string"],
  "recommendation": "string"
}

FORBIDDEN:
- Do NOT output markdown or code blocks
- Do NOT add explanations outside JSON
- Do NOT fabricate questions not in the transcript
- Do NOT be overly lenient — be constructive but honest"""


# ============================================
# Transcript Parser
# ============================================

def parse_transcript_to_qa_pairs(segments: List[Dict]) -> List[Dict]:
    """
    Parse labeled transcript segments into Q&A pairs.
    Groups consecutive INTERVIEWER segments as question,
    consecutive CANDIDATE segments as answer.
    """
    if not segments:
        return []

    qa_pairs = []
    current_question = ""
    current_answer = ""
    collecting_answer = False

    for seg in segments:
        speaker = seg.get("speaker", "").upper()
        text = seg.get("text", "").strip()

        if not text:
            continue

        if speaker == "INTERVIEWER":
            # If we were collecting an answer, save the pair
            if collecting_answer and current_question and current_answer:
                qa_pairs.append({
                    "question": current_question.strip(),
                    "answer": current_answer.strip()
                })
                current_answer = ""

            # Accumulate question text
            if not collecting_answer:
                current_question += " " + text
            else:
                current_question = text
                collecting_answer = False

        elif speaker == "CANDIDATE":
            collecting_answer = True
            current_answer += " " + text

    # Don't forget the last pair
    if current_question and current_answer:
        qa_pairs.append({
            "question": current_question.strip(),
            "answer": current_answer.strip()
        })

    return qa_pairs


# ============================================
# Main Evaluation Function
# ============================================

async def evaluate_interview(
    user_id: str,
    transcript_segments: List[Dict],
    session_id: Optional[str] = None
) -> InterviewEvaluation:
    """
    Evaluate a mock interview transcript.

    Args:
        user_id: The user's ID
        transcript_segments: List of {speaker, text, start?, end?} dicts
        session_id: Optional session identifier

    Returns:
        InterviewEvaluation with scores and feedback
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    trace_id = start_trace(
        "InterviewEvaluationAgent",
        metadata={"user_id": user_id, "session_id": session_id, "segments": len(transcript_segments)},
        tags=["interview", "evaluation"]
    )

    # Parse Q&A pairs
    qa_pairs = parse_transcript_to_qa_pairs(transcript_segments)

    if not qa_pairs:
        # If no clear Q&A pairs, treat entire transcript as one block
        full_text = " ".join(s.get("text", "") for s in transcript_segments)
        qa_pairs = [{
            "question": "(Full interview — no clear Q&A separation detected)",
            "answer": full_text
        }]

    # Build prompt
    transcript_text = ""
    for i, pair in enumerate(qa_pairs, 1):
        transcript_text += f"\n--- Q&A Pair {i} ---\n"
        transcript_text += f"INTERVIEWER: {pair['question']}\n"
        transcript_text += f"CANDIDATE: {pair['answer']}\n"

    prompt = f"""Evaluate the following mock interview transcript.
There are {len(qa_pairs)} question-answer pairs.

TRANSCRIPT:
{transcript_text}

Provide your evaluation as JSON following the exact format specified."""

    # Call LLM
    try:
        async with create_span_async(trace_id, "LLM_InterviewEval", span_type="llm", input_data={"qa_pairs": len(qa_pairs)}) as span:
            augmented_prompt = inject_opik_eval(INTERVIEW_EVAL_SYSTEM_PROMPT, agent_type="InterviewEvaluation")
            full_response = await call_gemini(
                prompt=prompt,
                system_prompt=augmented_prompt
            )
            eval_result = parse_opik_eval(full_response)
            raw_response = eval_result["content"]
            opik_evaluation = eval_result["evaluation"] if eval_result["has_eval"] else None
            if opik_evaluation:
                log_opik_eval(trace_id, opik_evaluation)
            span.set_output({"response_length": len(raw_response), "has_opik_eval": eval_result["has_eval"]})

        # Parse JSON from response
        # Strip markdown code fences if present
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

        eval_data = json.loads(cleaned)

    except (json.JSONDecodeError, LLMError) as e:
        print(f"[InterviewEval] LLM error or parse error: {e}")
        end_trace(trace_id, output={"error": str(e)}, status="error")
        # Return a fallback evaluation
        return InterviewEvaluation(
            session_id=session_id,
            user_id=user_id,
            overall_score=0,
            overall_rating="Unable to Evaluate",
            total_questions=len(qa_pairs),
            questions_evaluated=0,
            qa_evaluations=[],
            strengths_summary=[],
            improvement_areas=["Could not evaluate — transcript may be too short or unclear"],
            communication_score=0,
            technical_score=0,
            confidence_score=0,
            recommendation="Please try again with a longer interview session.",
            evaluated_at=datetime.utcnow().isoformat()
        )

    # Build typed evaluation
    qa_evals = []
    for qa in eval_data.get("qa_evaluations", []):
        qa_evals.append(QAEvaluation(
            question=qa.get("question", ""),
            candidate_answer=qa.get("candidate_answer", ""),
            quality_score=min(10, max(0, int(qa.get("quality_score", 0)))),
            ideal_answer_summary=qa.get("ideal_answer_summary", ""),
            feedback=qa.get("feedback", ""),
            strengths=qa.get("strengths", []),
            improvements=qa.get("improvements", [])
        ))

    overall_score = min(100, max(0, int(eval_data.get("overall_score", 0))))

    # Determine rating from score
    if overall_score >= 81:
        rating = "Excellent"
    elif overall_score >= 61:
        rating = "Good"
    elif overall_score >= 41:
        rating = "Average"
    elif overall_score >= 21:
        rating = "Below Average"
    else:
        rating = "Poor"

    log_metric(trace_id, "overall_score", float(overall_score))
    log_metric(trace_id, "communication_score", float(min(10, max(0, int(eval_data.get("communication_score", 0))))))
    log_metric(trace_id, "technical_score", float(min(10, max(0, int(eval_data.get("technical_score", 0))))))
    log_feedback(trace_id, "interview_quality", float(overall_score / 10), rating, "llm-judge")
    end_trace(trace_id, output={"overall_score": overall_score, "rating": rating, "questions": len(qa_evals)}, status="success")

    evaluation = InterviewEvaluation(
        session_id=session_id,
        user_id=user_id,
        overall_score=overall_score,
        overall_rating=eval_data.get("overall_rating", rating),
        total_questions=len(qa_pairs),
        questions_evaluated=len(qa_evals),
        qa_evaluations=qa_evals,
        strengths_summary=eval_data.get("strengths_summary", []),
        improvement_areas=eval_data.get("improvement_areas", []),
        communication_score=min(10, max(0, int(eval_data.get("communication_score", 0)))),
        technical_score=min(10, max(0, int(eval_data.get("technical_score", 0)))),
        confidence_score=min(10, max(0, int(eval_data.get("confidence_score", 0)))),
        recommendation=eval_data.get("recommendation", ""),
        evaluated_at=datetime.utcnow().isoformat(),
        opik_eval=opik_evaluation
    )

    return evaluation
