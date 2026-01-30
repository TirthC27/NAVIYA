"""
LearnTube AI - Progressive Learning Agent with LangGraph
Workflow: Topic → Small Roadmap → One Video Per Step → Progressive Deepening
"""

from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
import asyncio
import json

from app.agents.llm import call_gemini, LLMError
from app.youtube.client import fetch_single_best_video, YouTubeError


# ============================================
# State Schema
# ============================================
class ProgressiveLearningState(TypedDict):
    """State for progressive learning workflow"""
    user_topic: str
    difficulty: str  # simple, medium, hard
    depth_level: int  # Current depth (1, 2, 3...)
    previous_steps: List[str]  # Steps already completed
    roadmap: dict  # Current roadmap with steps
    step_videos: List[dict]  # One video per step
    current_step: int
    final_response: dict
    errors: List[str]


# ============================================
# Node 1: Difficulty Analyzer
# ============================================
async def difficulty_analyzer_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Analyze topic difficulty to determine roadmap size.
    Simple → 1-2 steps, Medium → 3-4 steps, Hard → max 6 steps
    """
    try:
        user_topic = state["user_topic"]
        
        system_prompt = """You are an educational content classifier.
Analyze the topic and classify its difficulty for learning.

Rules:
- "simple": Basic concepts that can be learned in 1-2 videos (e.g., "what is HTML", "basic loops")
- "medium": Topics requiring 3-4 videos to understand (e.g., "React hooks", "SQL joins")
- "hard": Complex topics needing 5-6 videos (e.g., "machine learning", "system design")

Respond with ONLY one word: simple, medium, or hard"""

        prompt = f"Classify the difficulty of learning: {user_topic}"
        
        response = await call_gemini(prompt, system_prompt)
        difficulty = response.strip().lower()
        
        if difficulty not in ["simple", "medium", "hard"]:
            difficulty = "medium"
        
        print(f"📊 Topic '{user_topic}' classified as: {difficulty}")
        
        return {
            **state,
            "difficulty": difficulty,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        return {
            **state,
            "difficulty": "medium",
            "errors": state.get("errors", []) + [f"Difficulty analysis error: {str(e)}"]
        }


# ============================================
# Node 2: Roadmap Generator (Small & Adaptive)
# ============================================
async def roadmap_generator_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Generate a SMALL adaptive roadmap based on difficulty.
    Each step will map to exactly ONE video.
    """
    try:
        user_topic = state["user_topic"]
        difficulty = state.get("difficulty", "medium")
        depth_level = state.get("depth_level", 1)
        previous_steps = state.get("previous_steps", [])
        
        step_counts = {"simple": 2, "medium": 4, "hard": 6}
        max_steps = step_counts.get(difficulty, 4)
        
        previous_context = ""
        if previous_steps:
            previous_context = f"""
The user has already completed these topics:
{', '.join(previous_steps)}

Now generate the NEXT level of depth - more advanced subtopics they haven't learned yet.
DO NOT repeat any previously learned topics."""
        
        system_prompt = f"""You are an expert curriculum designer creating SMALL, focused learning roadmaps.

RULES:
1. Generate exactly {max_steps} learning steps (no more, no less)
2. Each step must be a specific, focused concept
3. Each step title should be searchable on YouTube
4. Order from basic to more advanced
5. Steps should be completable with ONE video each
{previous_context}

RESPOND WITH ONLY VALID JSON in this exact format:
{{
  "depth": {depth_level},
  "topic": "{user_topic}",
  "steps": [
    {{"title": "Step Title", "query": "youtube search query for best tutorial"}},
    ...
  ]
}}"""

        prompt = f"Create a learning roadmap for: {user_topic}"
        
        response = await call_gemini(prompt, system_prompt)
        
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        roadmap = json.loads(response)
        
        if "steps" not in roadmap or not isinstance(roadmap["steps"], list):
            raise ValueError("Invalid roadmap structure")
        
        roadmap["steps"] = roadmap["steps"][:max_steps]
        
        print(f"✅ Generated roadmap with {len(roadmap['steps'])} steps at depth {depth_level}")
        
        return {
            **state,
            "roadmap": roadmap,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        fallback_roadmap = {
            "depth": state.get("depth_level", 1),
            "topic": state["user_topic"],
            "steps": [
                {"title": f"Introduction to {state['user_topic']}", "query": f"{state['user_topic']} introduction tutorial"},
                {"title": f"Core Concepts of {state['user_topic']}", "query": f"{state['user_topic']} core concepts explained"},
            ]
        }
        return {
            **state,
            "roadmap": fallback_roadmap,
            "errors": state.get("errors", []) + [f"Roadmap error: {str(e)}"]
        }


# ============================================
# Node 3: Video Fetcher (ONE video per step)
# ============================================
async def video_fetcher_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Fetch exactly ONE best video for each roadmap step.
    """
    try:
        roadmap = state.get("roadmap", {})
        steps = roadmap.get("steps", [])
        
        if not steps:
            return {
                **state,
                "step_videos": [],
                "errors": state.get("errors", []) + ["No steps in roadmap"]
            }
        
        step_videos = []
        
        for i, step in enumerate(steps):
            query = step.get("query", step.get("title", ""))
            title = step.get("title", f"Step {i+1}")
            
            print(f"🔍 Finding best video for: {title}")
            
            try:
                video = await fetch_single_best_video(query)
                
                if video:
                    step_videos.append({
                        "step_number": i + 1,
                        "step_title": title,
                        "video": video,
                        "status": "pending"
                    })
                else:
                    step_videos.append({
                        "step_number": i + 1,
                        "step_title": title,
                        "video": None,
                        "status": "no_video",
                        "error": "No suitable video found"
                    })
            except Exception as e:
                step_videos.append({
                    "step_number": i + 1,
                    "step_title": title,
                    "video": None,
                    "status": "error",
                    "error": str(e)
                })
        
        print(f"✅ Fetched {len([v for v in step_videos if v['video']])} videos for {len(steps)} steps")
        
        return {
            **state,
            "step_videos": step_videos,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        return {
            **state,
            "step_videos": [],
            "errors": state.get("errors", []) + [f"Video fetch error: {str(e)}"]
        }


# ============================================
# Node 4: Final Response Builder
# ============================================
async def final_response_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """Build the final progressive learning response."""
    user_topic = state["user_topic"]
    difficulty = state.get("difficulty", "medium")
    depth_level = state.get("depth_level", 1)
    step_videos = state.get("step_videos", [])
    errors = state.get("errors", [])
    
    learning_steps = []
    for sv in step_videos:
        step = {
            "step_number": sv["step_number"],
            "title": sv["step_title"],
            "status": sv["status"]
        }
        
        if sv.get("video"):
            video = sv["video"]
            step["video"] = {
                "id": video.get("video_id"),
                "title": video.get("title"),
                "channel": video.get("channel_title"),
                "duration": video.get("duration_formatted"),
                "views": video.get("view_count"),
                "thumbnail": video.get("thumbnail_url"),
                "url": video.get("url"),
                "has_captions": video.get("has_captions", False)
            }
        
        learning_steps.append(step)
    
    final_response = {
        "topic": user_topic,
        "difficulty": difficulty,
        "depth_level": depth_level,
        "total_steps": len(learning_steps),
        "learning_steps": learning_steps,
        "can_go_deeper": depth_level < 3,
        "errors": errors if errors else None
    }
    
    return {
        **state,
        "final_response": final_response
    }


# ============================================
# Build the LangGraph
# ============================================
def create_progressive_learning_graph():
    """Create the progressive learning workflow graph"""
    
    workflow = StateGraph(ProgressiveLearningState)
    
    workflow.add_node("difficulty_analyzer", difficulty_analyzer_node)
    workflow.add_node("roadmap_generator", roadmap_generator_node)
    workflow.add_node("video_fetcher", video_fetcher_node)
    workflow.add_node("final_response", final_response_node)
    
    workflow.set_entry_point("difficulty_analyzer")
    workflow.add_edge("difficulty_analyzer", "roadmap_generator")
    workflow.add_edge("roadmap_generator", "video_fetcher")
    workflow.add_edge("video_fetcher", "final_response")
    workflow.add_edge("final_response", END)
    
    return workflow.compile()


progressive_learning_graph = create_progressive_learning_graph()


# ============================================
# Public API Functions
# ============================================
async def generate_learning_plan(user_topic: str, depth_level: int = 1, previous_steps: List[str] = None) -> dict:
    """Generate a progressive learning plan."""
    initial_state: ProgressiveLearningState = {
        "user_topic": user_topic,
        "difficulty": "medium",
        "depth_level": depth_level,
        "previous_steps": previous_steps or [],
        "roadmap": {},
        "step_videos": [],
        "current_step": 1,
        "final_response": {},
        "errors": []
    }
    
    final_state = await progressive_learning_graph.ainvoke(initial_state)
    return final_state.get("final_response", {})


async def generate_deeper_roadmap(user_topic: str, completed_steps: List[str], current_depth: int) -> dict:
    """Generate a deeper roadmap after user completes current level."""
    new_depth = current_depth + 1
    
    if new_depth > 3:
        return {
            "topic": user_topic,
            "message": "Congratulations! You've mastered this topic at all levels! 🎉",
            "completed": True,
            "total_steps_completed": len(completed_steps)
        }
    
    return await generate_learning_plan(
        user_topic=user_topic,
        depth_level=new_depth,
        previous_steps=completed_steps
    )


learning_graph = progressive_learning_graph
