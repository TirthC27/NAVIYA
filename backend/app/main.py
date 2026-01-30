"""
LearnTube AI - Main FastAPI Application
Progressive Learning Agent with adaptive roadmaps
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from app.config import settings, validate_settings
from app.agents.llm import call_gemini
from app.agents.learning_graph import generate_learning_plan, generate_deeper_roadmap

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered YouTube learning platform with intelligent agents",
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


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the server is running
    Returns server status and configuration validation
    """
    config_status = validate_settings()
    
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "config": {
            "valid": config_status["valid"],
            "configured_keys": config_status["configured"],
            "missing_keys": config_status["missing"]
        }
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


# Request model for LLM endpoint
class PromptRequest(BaseModel):
    prompt: str
    system_prompt: str | None = None


@app.post("/api/llm/generate")
async def generate_response(request: PromptRequest):
    """
    Generate a response from Gemini LLM via OpenRouter
    """
    try:
        response = await call_gemini(request.prompt, request.system_prompt)
        return {
            "success": True,
            "response": response,
            "model": settings.GEMINI_MODEL
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Request model for Learning Plan endpoint
class LearningPlanRequest(BaseModel):
    user_topic: str
    depth_level: int = 1
    previous_steps: List[str] = []


@app.post("/generate-learning-plan")
async def create_learning_plan_endpoint(request: LearningPlanRequest):
    """
    Generate a progressive learning plan using LangGraph.
    
    Features:
    - Small adaptive roadmaps (1-6 steps based on difficulty)
    - ONE best video per step
    - Supports depth levels for progressive learning
    
    Returns:
        Learning plan with steps and single video per step
    """
    try:
        result = await generate_learning_plan(
            user_topic=request.user_topic,
            depth_level=request.depth_level,
            previous_steps=request.previous_steps
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
        # For now, return simulated response (DB integration optional)
        return {
            "success": True,
            "message": "Nice job! ❤️",
            "step_number": request.step_number,
            "completed": True,
            "prompt_deeper": True,
            "deeper_message": "Want to go deeper into this topic?"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Request model for deeper roadmap
class DeeperRoadmapRequest(BaseModel):
    user_topic: str
    completed_steps: List[str]
    current_depth: int


@app.post("/roadmap/deepen")
async def deepen_roadmap_endpoint(request: DeeperRoadmapRequest):
    """
    Generate a deeper roadmap after user completes current level.
    
    Args:
        user_topic: Original topic
        completed_steps: All steps completed so far
        current_depth: Current depth level (1, 2, or 3)
    
    Returns:
        Next level learning plan or completion message
    """
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
