"""
LearnTube AI - Main FastAPI Application
Progressive Learning Agent with adaptive roadmaps

OPIK Integration Features:
- Full pipeline tracing
- LLM-as-judge evaluations
- Safety guardrails with PII detection
- Observability dashboard endpoints
- Regression test endpoints
- Supabase database integration
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import asyncio

from app.config import settings, validate_settings
from app.agents.llm import call_gemini
from app.agents.learning_graph import (
    generate_learning_plan, 
    generate_deeper_roadmap,
    generate_clarification_questions,
    determine_learning_mode,
    LEARNING_MODES
)

# OPIK Observability
from app.observability.opik_client import (
    init_opik,
    get_dashboard_stats,
    get_metrics_buffer,
    clear_metrics_buffer
)

# Safety & Evaluations
from app.safety.pii_guard import (
    SafetyGuard,
    check_content_safety,
    get_safety_metrics,
    safety_middleware
)
from app.evals.judges import evaluate_learning_plan as run_evaluation

# Database Routes
from app.routes.plans import router as plans_router
from app.routes.metrics import router as metrics_router
from app.routes.career import router as career_router
from app.routes.auth import router as auth_router
from app.routes.onboarding import router as onboarding_router
from app.routes.agents import router as agents_router
from app.routes.mentor import router as mentor_router
from app.routes.resume import router as resume_router
from app.routes.resume_simple import router as resume_simple_router
from app.routes.roadmap_api import router as roadmap_router
from app.routes.skill_assessment_api import router as skill_assessment_router
from app.routes.dashboard_state_api import router as dashboard_state_router
from app.routes.career_intelligence import router as career_intelligence_router
from app.routes.skill_roadmap import router as skill_roadmap_router
from app.routes.skill_assessment_scenario import router as skill_assessment_scenario_router
from app.routes.activity import router as activity_router
from app.routes.interview import router as interview_router
from app.routes.topic_explainer import router as topic_explainer_router

# ============================================
# Initialize FastAPI application
# ============================================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
AI-powered YouTube learning platform with intelligent agents.

**Features:**
- Dynamic learning roadmaps (quick/standard/comprehensive)
- Full OPIK tracing and observability
- LLM-as-judge quality evaluations
- Safety guardrails with PII detection
- Supabase database integration
- Regression testing and experiments
    """,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize safety guard
safety_guard = SafetyGuard(strict_mode=True)

# ============================================
# Include Routers (Supabase Database Endpoints)
# ============================================
app.include_router(auth_router, prefix="/api")
app.include_router(onboarding_router, prefix="/api")
app.include_router(agents_router, prefix="/api")
app.include_router(mentor_router)  # Already has /api/mentor prefix
app.include_router(resume_router)  # Already has /api/resume prefix
app.include_router(resume_simple_router)  # Already has /api/resume-simple prefix
app.include_router(roadmap_router)  # Already has /api/roadmap prefix
app.include_router(skill_assessment_router, prefix="/api")  # /api/assessments
app.include_router(dashboard_state_router, prefix="/api")  # /api/dashboard-state
app.include_router(plans_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(career_router, prefix="/api")
app.include_router(career_intelligence_router)  # Already has /api/career-intelligence prefix
app.include_router(skill_roadmap_router)  # Already has /api/skill-roadmap prefix
app.include_router(skill_assessment_scenario_router)  # Already has /api/skill-assessment prefix
app.include_router(activity_router)  # Already has /api/activity prefix
app.include_router(interview_router)  # Already has /api/interview prefix
app.include_router(topic_explainer_router)  # Already has /api/topic-explainer prefix


# ============================================
# Lifespan Events
# ============================================
@app.on_event("startup")
async def startup_event():
    """Initialize OPIK on startup"""
    try:
        init_opik(project_name="Naviya")
        print("✅ OPIK initialized successfully")
    except Exception as e:
        print(f"⚠️ OPIK running in mock mode: {e}")


# ============================================
# Health & Info Endpoints
# ============================================
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the server is running.
    Returns server status, configuration validation, and OPIK stats.
    """
    config_status = validate_settings()
    opik_stats = get_dashboard_stats()
    
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "config": {
            "valid": config_status["valid"],
            "configured_keys": config_status["configured"],
            "missing_keys": config_status["missing"]
        },
        "opik_stats": opik_stats
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "features": [
            "OPIK Tracing",
            "LLM-as-Judge Evaluations",
            "Safety Guardrails",
            "Regression Testing"
        ],
        "docs": "/docs",
        "health": "/health",
        "observability": "/api/observability/dashboard"
    }


# ============================================
# LLM Endpoint
# ============================================
class PromptRequest(BaseModel):
    prompt: str
    system_prompt: str | None = None


@app.post("/api/llm/generate")
async def generate_response(request: PromptRequest):
    """
    Generate a response from Gemini LLM via OpenRouter.
    Includes safety checks on input.
    """
    # Safety check
    safety_result = await check_content_safety(request.prompt)
    if not safety_result.is_safe:
        return {
            "success": False,
            "blocked": True,
            "reason": safety_result.reason,
            "message": safety_result.suggested_response
        }
    
    try:
        response = await call_gemini(request.prompt, request.system_prompt)
        return {
            "success": True,
            "response": response,
            "model": settings.GEMINI_MODEL
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Learning Plan Endpoints
# ============================================
class ClarificationRequest(BaseModel):
    user_topic: str


class LearningPlanRequest(BaseModel):
    user_topic: str
    learning_mode: str = "standard"  # quick, standard, comprehensive
    depth_level: int = 1
    previous_steps: List[str] = []
    user_preferences: dict = {}  # Answers from clarification questions
    enable_evaluation: bool = True


@app.get("/api/learning-modes")
async def get_learning_modes():
    """
    Get available learning modes and their configurations.
    """
    return {
        "modes": LEARNING_MODES,
        "description": "Choose your learning style based on time and depth"
    }


@app.post("/api/clarify")
async def get_clarification_questions(request: ClarificationRequest):
    """
    Step 1: Get clarification questions for a topic.
    
    The LLM generates 3 multi-choice questions to understand:
    - User's current knowledge level
    - Learning goals
    - Time commitment
    
    Frontend should display these questions and collect answers,
    then call /generate-learning-plan with the learning_mode.
    """
    # Safety check on topic
    is_safe, error_message = await safety_guard.check_topic(request.user_topic)
    if not is_safe:
        return {
            "success": False,
            "blocked": True,
            "message": error_message
        }
    
    try:
        result = await generate_clarification_questions(request.user_topic)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DetermineModeRequest(BaseModel):
    answers: List[dict]  # [{"id": 1, "selected": "a", "implies": "quick"}, ...]


@app.post("/api/determine-mode")
async def determine_mode_from_answers(request: DetermineModeRequest):
    """
    Step 2: Determine the best learning mode from user's answers.
    
    Takes the answers from clarification questions and returns
    the recommended learning mode.
    """
    mode = determine_learning_mode(request.answers)
    return {
        "success": True,
        "learning_mode": mode,
        "mode_config": LEARNING_MODES[mode]
    }


@app.post("/generate-learning-plan")
async def create_learning_plan_endpoint(request: LearningPlanRequest):
    """
    Generate a DYNAMIC learning plan using LangGraph.
    
    Learning Modes:
    - quick: 2-4 steps, short videos (~1 hour total)
    - standard: 5-8 steps, medium videos (~3 hours total)
    - comprehensive: 10-15 steps, full course (~8+ hours)
    
    Flow:
    1. Call /api/clarify first to get questions (optional)
    2. Collect user answers to determine learning_mode
    3. Call this endpoint with the learning_mode
    
    Features:
    - Dynamic roadmap sizes based on learning mode
    - Safety checks on topic
    - ONE best video per step
    - Full OPIK tracing
    - Automatic LLM-as-judge evaluations
    
    Returns:
        Learning plan with steps, videos, and observability metadata
    """
    # Safety check on topic
    is_safe, error_message = await safety_guard.check_topic(request.user_topic)
    if not is_safe:
        return {
            "success": False,
            "blocked": True,
            "message": error_message,
            "safety_check": "failed"
        }
    
    # Validate learning mode
    if request.learning_mode not in LEARNING_MODES:
        request.learning_mode = "standard"
    
    try:
        result = await generate_learning_plan(
            user_topic=request.user_topic,
            learning_mode=request.learning_mode,
            depth_level=request.depth_level,
            previous_steps=request.previous_steps,
            user_preferences=request.user_preferences,
            enable_tracing=True,
            enable_evaluation=request.enable_evaluation
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Request model for step completion
class StepCompleteRequest(BaseModel):
    plan_id: str
    step_number: int
    user_id: str = "anonymous"


@app.post("/step/complete")
async def complete_step_endpoint(request: StepCompleteRequest):
    """
    Mark a learning step as completed.
    Returns progress info and whether user can go deeper.
    """
    try:
        return {
            "success": True,
            "message": "Nice job! Keep learning!",
            "step_number": request.step_number,
            "completed": True,
            "prompt_deeper": True,
            "deeper_message": "Want to go deeper into this topic?"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DeeperRoadmapRequest(BaseModel):
    user_topic: str
    completed_steps: List[str]
    current_depth: int


@app.post("/roadmap/deepen")
async def deepen_roadmap_endpoint(request: DeeperRoadmapRequest):
    """
    Generate a deeper roadmap after user completes current level.
    """
    # Safety check
    is_safe, error_message = await safety_guard.check_topic(request.user_topic)
    if not is_safe:
        return {
            "success": False,
            "blocked": True,
            "message": error_message
        }
    
    try:
        result = await generate_deeper_roadmap(
            user_topic=request.user_topic,
            completed_steps=request.completed_steps,
            current_depth=request.current_depth
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# OPIK Observability Endpoints
# ============================================
@app.get("/api/observability/dashboard")
async def get_observability_dashboard():
    """
    Get comprehensive observability dashboard data.
    
    Returns:
    - Trace statistics
    - Average evaluation scores
    - Safety metrics
    - System health indicators
    """
    opik_stats = get_dashboard_stats()
    safety_stats = get_safety_metrics()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "tracing": opik_stats,
        "safety": safety_stats,
        "system": {
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "healthy"
        }
    }


@app.get("/api/observability/traces")
async def get_recent_traces(limit: int = 50):
    """
    Get recent traces from the metrics buffer.
    """
    buffer = get_metrics_buffer()
    recent = buffer[-limit:] if buffer else []
    
    # Format for display
    formatted = []
    for trace in recent:
        formatted.append({
            "id": trace.get("id", "unknown"),
            "name": trace.get("name", "unknown"),
            "duration_seconds": trace.get("duration", 0),
            "status": trace.get("status", "unknown"),
            "spans_count": len(trace.get("spans", [])),
            "metrics": trace.get("metrics", {}),
            "feedback": trace.get("feedback", []),
            "start_time": trace.get("start_datetime", "")
        })
    
    return {
        "total_traces": len(buffer),
        "returned": len(formatted),
        "traces": formatted
    }


@app.post("/api/observability/clear")
async def clear_trace_buffer():
    """Clear the trace metrics buffer (for testing)"""
    clear_metrics_buffer()
    return {"success": True, "message": "Metrics buffer cleared"}


# ============================================
# Safety Endpoints
# ============================================
class SafetyCheckRequest(BaseModel):
    text: str
    check_pii: bool = True
    check_unsafe: bool = True


@app.post("/api/safety/check")
async def check_safety_endpoint(request: SafetyCheckRequest):
    """
    Run a safety check on provided text.
    
    Checks for:
    - PII (emails, phones, SSN, crypto wallets)
    - Cheating requests
    - Unsafe content
    - Harmful queries
    """
    result = await check_content_safety(
        request.text,
        check_pii=request.check_pii,
        check_unsafe=request.check_unsafe
    )
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        **result.to_dict()
    }


@app.get("/api/safety/metrics")
async def get_safety_metrics_endpoint():
    """
    Get safety system metrics.
    
    Returns:
    - Total checks
    - Block rate
    - False alarm rate
    - Detection counts by category
    """
    metrics = get_safety_metrics()
    return {
        "timestamp": datetime.utcnow().isoformat(),
        **metrics
    }


@app.post("/api/safety/report-false-positive")
async def report_false_positive_endpoint(category: str):
    """Report a false positive for safety metrics tracking"""
    safety_guard.report_false_positive(category)
    return {
        "success": True,
        "message": f"False positive reported for category: {category}"
    }


# ============================================
# Evaluation Endpoints
# ============================================
class EvaluationRequest(BaseModel):
    learning_plan: dict


@app.post("/api/evaluate/plan")
async def evaluate_plan_endpoint(request: EvaluationRequest):
    """
    Run LLM-as-judge evaluations on a learning plan.
    
    Evaluates:
    - Roadmap relevance
    - Video quality
    - Simplicity
    - Progressiveness
    
    Returns detailed scores and recommendations.
    """
    try:
        result = await run_evaluation(request.learning_plan)
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "evaluation": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Regression Test Endpoints
# ============================================
class RegressionTestRequest(BaseModel):
    experiment_name: str = "manual_test"
    topics: Optional[List[str]] = None


@app.post("/api/tests/regression")
async def run_regression_test_endpoint(
    request: RegressionTestRequest,
    background_tasks: BackgroundTasks
):
    """
    Run regression tests on the learning plan generator.
    
    This runs asynchronously in the background.
    Check /api/observability/dashboard for results.
    """
    from app.evals.regression_tests import run_quick_regression, RegressionTestRunner
    
    async def run_tests():
        if request.topics:
            await run_quick_regression(request.topics)
        else:
            runner = RegressionTestRunner()
            await runner.run_experiment(request.experiment_name)
    
    background_tasks.add_task(lambda: asyncio.create_task(run_tests()))
    
    return {
        "success": True,
        "message": f"Regression test '{request.experiment_name}' started in background",
        "check_results_at": "/api/observability/dashboard"
    }


# ============================================
# Hackathon Demo Endpoints
# ============================================
@app.get("/api/demo/showcase")
async def hackathon_showcase():
    """
    Hackathon showcase endpoint demonstrating all features.
    """
    return {
        "app_name": "LearnTube AI",
        "tagline": "Hackathon-Grade Agentic Learning Platform",
        "features": {
            "core": [
                "AI-powered learning roadmap generation",
                "Adaptive difficulty assessment",
                "YouTube video curation per step",
                "Progressive depth levels"
            ],
            "observability": [
                "Full OPIK tracing integration",
                "Span-level timing for all pipeline nodes",
                "Real-time metrics dashboard",
                "Trace history and analysis"
            ],
            "evaluation": [
                "LLM-as-judge automatic scoring",
                "4 evaluation dimensions (relevance, quality, simplicity, progressiveness)",
                "Feedback logging to OPIK",
                "Batch evaluation for experiments"
            ],
            "safety": [
                "PII detection (email, phone, SSN, crypto)",
                "Cheating request blocking",
                "Unsafe content filtering",
                "Safety metrics tracking"
            ],
            "testing": [
                "Golden dataset with 12+ test cases",
                "Automated regression testing",
                "A/B testing support",
                "Experiment tracking"
            ]
        },
        "api_endpoints": {
            "main": "/generate-learning-plan",
            "observability": "/api/observability/dashboard",
            "safety": "/api/safety/check",
            "evaluation": "/api/evaluate/plan",
            "regression": "/api/tests/regression"
        },
        "demo_topics": [
            "Python programming",
            "React hooks",
            "Machine learning fundamentals",
            "Docker containers"
        ]
    }


# ============================================
# Main entry point
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
