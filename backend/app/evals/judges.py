"""
LearnTube AI - LLM-as-Judge Evaluations
Automated quality scoring for learning plans using Gemini

Evaluation Dimensions:
1. Roadmap Relevance Score (0-10) - Are steps logically aligned with user topic?
2. Video Quality Score (0-10) - Is the video educational, not clickbait?
3. Simplicity Score (0-10) - Is roadmap small enough (not overwhelming)?
4. Progressiveness Score (0-10) - Does it encourage gradual deep learning?

All evaluations are logged to OPIK for tracking and analysis.
"""

import json
import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
from datetime import datetime

from app.agents.llm import call_gemini, LLMError
from app.observability.opik_client import (
    log_feedback,
    log_metric,
    create_span_async
)


# ============================================
# Data Classes
# ============================================
@dataclass
class EvaluationResult:
    """Result of a single evaluation"""
    dimension: str
    score: float  # 0-10
    reason: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    evaluator: str = "gemini-judge"
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ComprehensiveEvaluation:
    """Complete evaluation results for a learning plan"""
    topic: str
    overall_score: float
    evaluations: List[EvaluationResult]
    recommendation: str
    trace_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict:
        return {
            "topic": self.topic,
            "overall_score": self.overall_score,
            "evaluations": [e.to_dict() for e in self.evaluations],
            "recommendation": self.recommendation,
            "trace_id": self.trace_id,
            "timestamp": self.timestamp
        }


# ============================================
# Individual Evaluation Functions
# ============================================
async def evaluate_roadmap_relevance(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> EvaluationResult:
    """
    Evaluate how relevant the roadmap steps are to the user's topic.
    
    Criteria:
    - Steps directly relate to the topic
    - No off-topic or tangential content
    - Logical progression from topic fundamentals
    """
    topic = learning_plan.get("topic", "Unknown")
    steps = learning_plan.get("learning_steps", [])
    
    step_titles = [s.get("title", "") for s in steps]
    
    system_prompt = """You are an expert curriculum evaluator. 
Evaluate how relevant each learning step is to the main topic.

Score from 0-10 where:
- 10: Every step is directly and clearly relevant to the topic
- 7-9: Most steps are relevant with minor tangents
- 4-6: Some steps seem off-topic or loosely connected
- 1-3: Many steps don't relate to the main topic
- 0: Steps are completely unrelated

Respond ONLY with valid JSON:
{
    "score": <number 0-10>,
    "reason": "<brief explanation>",
    "step_analysis": [
        {"step": "<title>", "relevance": "high/medium/low"}
    ]
}"""

    prompt = f"""Topic: {topic}

Learning Steps:
{json.dumps(step_titles, indent=2)}

Evaluate the relevance of these steps to the topic."""

    try:
        async with create_span_async(
            trace_id,
            "EvalRoadmapRelevance",
            span_type="llm",
            input_data={"topic": topic, "steps_count": len(steps)}
        ) as span:
            response = await call_gemini(prompt, system_prompt)
            
            # Parse response
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            
            result = json.loads(response.strip())
            score = float(result.get("score", 5))
            reason = result.get("reason", "No reason provided")
            
            span.set_output({"score": score, "reason": reason})
            span.log_metric("relevance_score", score)
            
            # Log to OPIK
            if trace_id:
                log_feedback(trace_id, "roadmap_relevance", score, reason, "llm-judge")
            
            return EvaluationResult(
                dimension="roadmap_relevance",
                score=score,
                reason=reason,
                details=result.get("step_analysis", [])
            )
    except Exception as e:
        return EvaluationResult(
            dimension="roadmap_relevance",
            score=5.0,
            reason=f"Evaluation failed: {str(e)}",
            details={"error": str(e)}
        )


async def evaluate_video_quality(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> EvaluationResult:
    """
    Evaluate the quality of recommended videos.
    
    Criteria:
    - Educational content vs clickbait
    - Reputable channels
    - Appropriate video length
    - Clear titles indicating educational value
    """
    topic = learning_plan.get("topic", "Unknown")
    steps = learning_plan.get("learning_steps", [])
    
    videos_info = []
    for step in steps:
        video = step.get("video", {})
        if video:
            videos_info.append({
                "title": video.get("title", "Unknown"),
                "channel": video.get("channel", "Unknown"),
                "duration": video.get("duration", "Unknown"),
                "views": video.get("views", 0)
            })
    
    if not videos_info:
        return EvaluationResult(
            dimension="video_quality",
            score=0.0,
            reason="No videos found in learning plan",
            details={"videos_count": 0}
        )
    
    system_prompt = """You are a video content quality evaluator for educational platforms.
Evaluate the quality of recommended YouTube videos for learning.

Score from 0-10 where:
- 10: All videos appear to be high-quality educational content from reputable creators
- 7-9: Most videos are educational with good production quality
- 4-6: Mixed quality - some educational, some potentially clickbait
- 1-3: Many videos appear to be low-quality or clickbait
- 0: All videos seem inappropriate for learning

Look for RED FLAGS:
- ALL CAPS or excessive punctuation in titles
- Clickbait phrases like "YOU WON'T BELIEVE", "MUST WATCH"
- Very short videos (under 3 min) for complex topics
- Unknown or suspicious channel names

Respond ONLY with valid JSON:
{
    "score": <number 0-10>,
    "reason": "<brief explanation>",
    "video_analysis": [
        {"title": "<video title>", "quality": "high/medium/low", "flags": ["<any concerns>"]}
    ]
}"""

    prompt = f"""Topic: {topic}

Recommended Videos:
{json.dumps(videos_info, indent=2)}

Evaluate the educational quality of these videos."""

    try:
        async with create_span_async(
            trace_id,
            "EvalVideoQuality",
            span_type="llm",
            input_data={"topic": topic, "videos_count": len(videos_info)}
        ) as span:
            response = await call_gemini(prompt, system_prompt)
            
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            
            result = json.loads(response.strip())
            score = float(result.get("score", 5))
            reason = result.get("reason", "No reason provided")
            
            span.set_output({"score": score, "reason": reason})
            span.log_metric("video_quality_score", score)
            
            if trace_id:
                log_feedback(trace_id, "video_quality", score, reason, "llm-judge")
            
            return EvaluationResult(
                dimension="video_quality",
                score=score,
                reason=reason,
                details=result.get("video_analysis", [])
            )
    except Exception as e:
        return EvaluationResult(
            dimension="video_quality",
            score=5.0,
            reason=f"Evaluation failed: {str(e)}",
            details={"error": str(e)}
        )


async def evaluate_simplicity(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> EvaluationResult:
    """
    Evaluate if the roadmap is appropriately simple and not overwhelming.
    
    Criteria:
    - Appropriate number of steps for difficulty level
    - Each step is focused and digestible
    - Not trying to cover too much at once
    """
    topic = learning_plan.get("topic", "Unknown")
    difficulty = learning_plan.get("difficulty", "medium")
    steps = learning_plan.get("learning_steps", [])
    
    expected_steps = {"simple": 2, "medium": 4, "hard": 6}
    max_expected = expected_steps.get(difficulty, 4)
    
    step_titles = [s.get("title", "") for s in steps]
    
    system_prompt = """You are an instructional design expert evaluating learning path complexity.
Evaluate if the learning roadmap is appropriately simple and digestible.

Score from 0-10 where:
- 10: Perfect simplicity - each step is focused, total steps are appropriate
- 7-9: Good simplicity with minor complexity issues
- 4-6: Some steps try to cover too much, or total is overwhelming
- 1-3: Many steps are too complex or there are too many steps
- 0: Extremely overwhelming and poorly structured

Consider:
- Does each step represent ONE clear concept?
- Is the total number of steps appropriate for a beginner-friendly roadmap?
- Would a learner feel confident starting this path?

Respond ONLY with valid JSON:
{
    "score": <number 0-10>,
    "reason": "<brief explanation>",
    "complexity_flags": ["<any concerns about complexity>"]
}"""

    prompt = f"""Topic: {topic}
Difficulty Level: {difficulty}
Expected Max Steps: {max_expected}
Actual Steps: {len(steps)}

Step Titles:
{json.dumps(step_titles, indent=2)}

Evaluate the simplicity and digestibility of this roadmap."""

    try:
        async with create_span_async(
            trace_id,
            "EvalSimplicity",
            span_type="llm",
            input_data={"topic": topic, "steps_count": len(steps), "difficulty": difficulty}
        ) as span:
            response = await call_gemini(prompt, system_prompt)
            
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            
            result = json.loads(response.strip())
            score = float(result.get("score", 5))
            reason = result.get("reason", "No reason provided")
            
            span.set_output({"score": score, "reason": reason})
            span.log_metric("simplicity_score", score)
            
            if trace_id:
                log_feedback(trace_id, "simplicity", score, reason, "llm-judge")
            
            return EvaluationResult(
                dimension="simplicity",
                score=score,
                reason=reason,
                details={
                    "complexity_flags": result.get("complexity_flags", []),
                    "expected_steps": max_expected,
                    "actual_steps": len(steps)
                }
            )
    except Exception as e:
        return EvaluationResult(
            dimension="simplicity",
            score=5.0,
            reason=f"Evaluation failed: {str(e)}",
            details={"error": str(e)}
        )


async def evaluate_progressiveness(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> EvaluationResult:
    """
    Evaluate if the roadmap encourages gradual, progressive learning.
    
    Criteria:
    - Starts with fundamentals
    - Each step builds on previous knowledge
    - Logical progression in complexity
    - Supports deep learning over time
    """
    topic = learning_plan.get("topic", "Unknown")
    depth_level = learning_plan.get("depth_level", 1)
    steps = learning_plan.get("learning_steps", [])
    
    step_titles = [s.get("title", "") for s in steps]
    
    system_prompt = """You are a learning progression specialist.
Evaluate if the roadmap supports gradual, progressive deep learning.

Score from 0-10 where:
- 10: Perfect progression - fundamentals first, each step builds naturally
- 7-9: Good progression with minor order issues
- 4-6: Some steps are out of order or don't build on each other
- 1-3: Poor progression - advanced topics before basics
- 0: Completely random or illogical order

Check for:
- Does Step 1 cover absolute basics/introduction?
- Does each subsequent step require previous knowledge?
- Is there a clear path from beginner to more advanced?

Respond ONLY with valid JSON:
{
    "score": <number 0-10>,
    "reason": "<brief explanation>",
    "progression_analysis": {
        "starts_with_basics": true/false,
        "logical_order": true/false,
        "suggested_reordering": ["<any suggestions>"]
    }
}"""

    prompt = f"""Topic: {topic}
Current Depth Level: {depth_level}

Learning Steps (in order):
{json.dumps(step_titles, indent=2)}

Evaluate the progressive learning structure of this roadmap."""

    try:
        async with create_span_async(
            trace_id,
            "EvalProgressiveness",
            span_type="llm",
            input_data={"topic": topic, "steps_count": len(steps), "depth_level": depth_level}
        ) as span:
            response = await call_gemini(prompt, system_prompt)
            
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            
            result = json.loads(response.strip())
            score = float(result.get("score", 5))
            reason = result.get("reason", "No reason provided")
            
            span.set_output({"score": score, "reason": reason})
            span.log_metric("progressiveness_score", score)
            
            if trace_id:
                log_feedback(trace_id, "progressiveness", score, reason, "llm-judge")
            
            return EvaluationResult(
                dimension="progressiveness",
                score=score,
                reason=reason,
                details=result.get("progression_analysis", {})
            )
    except Exception as e:
        return EvaluationResult(
            dimension="progressiveness",
            score=5.0,
            reason=f"Evaluation failed: {str(e)}",
            details={"error": str(e)}
        )


# ============================================
# Comprehensive Evaluation
# ============================================
async def run_all_evaluations(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> ComprehensiveEvaluation:
    """
    Run all evaluation dimensions in parallel and return comprehensive results.
    """
    topic = learning_plan.get("topic", "Unknown")
    
    # Run all evaluations in parallel
    results = await asyncio.gather(
        evaluate_roadmap_relevance(learning_plan, trace_id),
        evaluate_video_quality(learning_plan, trace_id),
        evaluate_simplicity(learning_plan, trace_id),
        evaluate_progressiveness(learning_plan, trace_id),
        return_exceptions=True
    )
    
    # Filter out any exceptions
    evaluations = []
    for r in results:
        if isinstance(r, EvaluationResult):
            evaluations.append(r)
        elif isinstance(r, Exception):
            evaluations.append(EvaluationResult(
                dimension="unknown",
                score=0,
                reason=f"Evaluation error: {str(r)}"
            ))
    
    # Calculate overall score (weighted average)
    weights = {
        "roadmap_relevance": 0.3,
        "video_quality": 0.25,
        "simplicity": 0.2,
        "progressiveness": 0.25
    }
    
    total_weight = 0
    weighted_sum = 0
    for eval_result in evaluations:
        weight = weights.get(eval_result.dimension, 0.25)
        weighted_sum += eval_result.score * weight
        total_weight += weight
    
    overall_score = weighted_sum / total_weight if total_weight > 0 else 0
    
    # Generate recommendation
    if overall_score >= 8:
        recommendation = "Excellent learning plan! Ready for production use."
    elif overall_score >= 6:
        recommendation = "Good learning plan with minor areas for improvement."
    elif overall_score >= 4:
        recommendation = "Acceptable but needs refinement in several areas."
    else:
        recommendation = "Learning plan needs significant improvement before use."
    
    # Log overall score to OPIK
    if trace_id:
        log_feedback(trace_id, "overall_quality", overall_score, recommendation, "llm-judge")
        log_metric(trace_id, "overall_eval_score", overall_score)
    
    return ComprehensiveEvaluation(
        topic=topic,
        overall_score=round(overall_score, 2),
        evaluations=evaluations,
        recommendation=recommendation,
        trace_id=trace_id
    )


async def evaluate_learning_plan(
    learning_plan: Dict,
    trace_id: Optional[str] = None
) -> Dict:
    """
    Main entry point for evaluating a learning plan.
    Returns a dictionary with all evaluation scores.
    """
    comprehensive = await run_all_evaluations(learning_plan, trace_id)
    return comprehensive.to_dict()


# ============================================
# Batch Evaluation for Experiments
# ============================================
async def evaluate_batch(
    learning_plans: List[Dict],
    experiment_name: str = "batch_eval"
) -> List[Dict]:
    """
    Evaluate multiple learning plans for A/B testing or experiments.
    """
    results = []
    for i, plan in enumerate(learning_plans):
        print(f"[EVAL] Evaluating plan {i+1}/{len(learning_plans)}...")
        eval_result = await evaluate_learning_plan(plan)
        eval_result["plan_index"] = i
        results.append(eval_result)
    
    # Calculate aggregate statistics
    scores = [r["overall_score"] for r in results]
    aggregate = {
        "experiment_name": experiment_name,
        "total_plans": len(results),
        "avg_score": sum(scores) / len(scores) if scores else 0,
        "min_score": min(scores) if scores else 0,
        "max_score": max(scores) if scores else 0,
        "results": results
    }
    
    return aggregate
