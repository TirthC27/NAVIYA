"""
Naviya AI - Progressive Learning Agent with LangGraph
Workflow: Topic -> Small Roadmap -> One Video Per Step -> Progressive Deepening

OPIK Integration:
- Full tracing of pipeline execution
- Span-level timing for each node
- Automatic metric logging
- Support for LLM-as-judge evaluations
"""

from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
import asyncio
import json
import time

from app.agents.llm import call_gemini, LLMError
from app.youtube.client import fetch_single_best_video, YouTubeError
from app.observability.opik_client import (
    OpikTracer,
    create_span_async,
    log_metric,
    log_feedback,
    start_trace,
    end_trace
)


# ============================================
# State Schema
# ============================================
class ProgressiveLearningState(TypedDict):
    """State for progressive learning workflow"""
    user_topic: str
    difficulty: str  # simple, medium, hard
    learning_mode: str  # quick, standard, comprehensive (from user clarification)
    depth_level: int  # Current depth (1, 2, 3...)
    previous_steps: List[str]  # Steps already completed
    roadmap: dict  # Current roadmap with steps
    step_videos: List[dict]  # One video per step
    current_step: int
    final_response: dict
    errors: List[str]
    # OPIK tracing fields
    trace_id: Optional[str]
    node_timings: dict  # Track timing per node
    # User preferences from clarification
    user_preferences: dict  # Contains answers from clarification questions


# ============================================
# Learning Mode Configuration
# ============================================
LEARNING_MODES = {
    "quick": {
        "name": "Quick Overview",
        "description": "Get a fast introduction (2-4 steps, short videos)",
        "min_steps": 2,
        "max_steps": 4,
        "video_duration": "short",  # < 15 mins
        "max_video_duration_mins": 15
    },
    "standard": {
        "name": "Standard Learning",
        "description": "Balanced learning path (5-8 steps, medium videos)",
        "min_steps": 5,
        "max_steps": 8,
        "video_duration": "medium",  # 10-30 mins
        "max_video_duration_mins": 30
    },
    "comprehensive": {
        "name": "Full Course",
        "description": "Deep dive like a course (10-15 steps, detailed videos)",
        "min_steps": 10,
        "max_steps": 15,
        "video_duration": "long",  # Any duration
        "max_video_duration_mins": 60
    }
}


# ============================================
# Clarification Questions Generator
# ============================================
async def generate_clarification_questions(user_topic: str) -> dict:
    """
    Generate 3 clarification questions to understand user's learning goals.
    Returns questions with multiple choice options.
    """
    system_prompt = """You are an educational assistant helping to understand what type of learning experience the user wants.

Based on the topic, generate exactly 3 clarification questions with 3 options each.
The questions should help determine:
1. User's current knowledge level
2. How deep they want to learn
3. Time commitment / learning goal

RESPOND WITH ONLY VALID JSON:
{
  "topic_analysis": "Brief analysis of the topic",
  "questions": [
    {
      "id": 1,
      "question": "The question text",
      "options": [
        {"id": "a", "text": "Option A text", "implies": "quick"},
        {"id": "b", "text": "Option B text", "implies": "standard"},
        {"id": "c", "text": "Option C text", "implies": "comprehensive"}
      ]
    }
  ]
}

The "implies" field indicates what learning mode each answer suggests:
- "quick": User wants a fast overview
- "standard": User wants balanced learning
- "comprehensive": User wants a full course experience"""

    prompt = f"Generate clarification questions for someone wanting to learn: {user_topic}"
    
    try:
        response = await call_gemini(prompt, system_prompt)
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        questions = json.loads(response.strip())
        return {
            "success": True,
            "topic": user_topic,
            "learning_modes": LEARNING_MODES,
            "clarification": questions
        }
    except Exception as e:
        # Fallback questions
        return {
            "success": True,
            "topic": user_topic,
            "learning_modes": LEARNING_MODES,
            "clarification": {
                "topic_analysis": f"Let's customize your learning path for {user_topic}",
                "questions": [
                    {
                        "id": 1,
                        "question": f"What's your current experience with {user_topic}?",
                        "options": [
                            {"id": "a", "text": "Complete beginner - never heard of it", "implies": "quick"},
                            {"id": "b", "text": "Some basics - know the concepts", "implies": "standard"},
                            {"id": "c", "text": "Intermediate - want to master it", "implies": "comprehensive"}
                        ]
                    },
                    {
                        "id": 2,
                        "question": "What's your learning goal?",
                        "options": [
                            {"id": "a", "text": "Just understand what it is", "implies": "quick"},
                            {"id": "b", "text": "Be able to use it practically", "implies": "standard"},
                            {"id": "c", "text": "Become proficient for work/projects", "implies": "comprehensive"}
                        ]
                    },
                    {
                        "id": 3,
                        "question": "How much time can you dedicate?",
                        "options": [
                            {"id": "a", "text": "30 mins - 1 hour (quick session)", "implies": "quick"},
                            {"id": "b", "text": "2-4 hours (over a few days)", "implies": "standard"},
                            {"id": "c", "text": "5+ hours (full course experience)", "implies": "comprehensive"}
                        ]
                    }
                ]
            }
        }


def determine_learning_mode(answers: List[dict]) -> str:
    """
    Determine the best learning mode based on user's answers.
    Each answer has an 'implies' field suggesting quick/standard/comprehensive.
    """
    mode_scores = {"quick": 0, "standard": 0, "comprehensive": 0}
    
    for answer in answers:
        implied_mode = answer.get("implies", "standard")
        if implied_mode in mode_scores:
            mode_scores[implied_mode] += 1
    
    # Return mode with highest score, default to standard
    return max(mode_scores, key=mode_scores.get) if any(mode_scores.values()) else "standard"


# ============================================
# Node 1: Difficulty Analyzer (with OPIK tracing)
# ============================================
async def difficulty_analyzer_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Analyze topic difficulty to fine-tune roadmap within user's chosen learning mode.
    
    OPIK: Tracks LLM call latency and classification accuracy
    """
    trace_id = state.get("trace_id")
    node_start = time.time()
    llm_latency = 0
    
    try:
        user_topic = state["user_topic"]
        learning_mode = state.get("learning_mode", "standard")
        
        async with create_span_async(
            trace_id,
            "DifficultyAnalyzer",
            span_type="llm",
            input_data={"topic": user_topic, "learning_mode": learning_mode}
        ) as span:
            system_prompt = """You are an educational content classifier.
Analyze the topic complexity to help calibrate the learning roadmap.

Rules:
- "simple": Basic concepts, foundational knowledge
- "medium": Intermediate complexity, requires some background
- "hard": Advanced topic, complex concepts

Respond with ONLY one word: simple, medium, or hard"""

            prompt = f"Classify the complexity of: {user_topic}"
            
            llm_start = time.time()
            response = await call_gemini(prompt, system_prompt)
            llm_latency = (time.time() - llm_start) * 1000  # ms
            
            difficulty = response.strip().lower()
            
            if difficulty not in ["simple", "medium", "hard"]:
                difficulty = "medium"
            
            span.set_output({"difficulty": difficulty, "raw_response": response})
            span.log_metric("llm_latency_ms", llm_latency)
        
        print(f"[OPIK] Topic '{user_topic}' classified as: {difficulty} (mode: {learning_mode})")
        
        # Log timing
        node_timings = state.get("node_timings", {}) or {}
        node_timings["difficulty_analyzer"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "llm_latency_ms": llm_latency
        }
        
        return {
            **state,
            "difficulty": difficulty,
            "node_timings": node_timings,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        node_timings = state.get("node_timings", {}) or {}
        node_timings["difficulty_analyzer"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "error": str(e)
        }
        return {
            **state,
            "difficulty": "medium",
            "node_timings": node_timings,
            "errors": state.get("errors", []) + [f"Difficulty analysis error: {str(e)}"]
        }


# ============================================
# Node 2: Roadmap Generator (with OPIK tracing)
# ============================================
async def roadmap_generator_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Generate a DYNAMIC roadmap based on user's learning mode and topic difficulty.
    
    Learning Modes:
    - quick: 2-4 steps, short videos
    - standard: 5-8 steps, medium videos  
    - comprehensive: 10-15 steps, detailed videos
    
    OPIK: Tracks roadmap generation quality and structure
    """
    trace_id = state.get("trace_id")
    node_start = time.time()
    llm_latency = 0
    
    try:
        user_topic = state["user_topic"]
        difficulty = state.get("difficulty", "medium")
        learning_mode = state.get("learning_mode", "standard")
        depth_level = state.get("depth_level", 1)
        previous_steps = state.get("previous_steps", [])
        user_preferences = state.get("user_preferences", {})
        
        # Get step count from learning mode configuration
        mode_config = LEARNING_MODES.get(learning_mode, LEARNING_MODES["standard"])
        min_steps = mode_config["min_steps"]
        max_steps = mode_config["max_steps"]
        video_preference = mode_config["video_duration"]
        
        # Adjust within range based on difficulty
        if difficulty == "simple":
            target_steps = min_steps
        elif difficulty == "hard":
            target_steps = max_steps
        else:
            target_steps = (min_steps + max_steps) // 2
        
        async with create_span_async(
            trace_id,
            "RoadmapGenerator",
            span_type="llm",
            input_data={
                "topic": user_topic,
                "difficulty": difficulty,
                "learning_mode": learning_mode,
                "target_steps": target_steps,
                "depth_level": depth_level
            }
        ) as span:
            previous_context = ""
            if previous_steps:
                previous_context = f"""
The user has already completed these topics:
{', '.join(previous_steps)}

Now generate the NEXT level of depth - more advanced subtopics they haven't learned yet.
DO NOT repeat any previously learned topics."""
            
            # Build preferences context from user answers
            preference_context = ""
            if user_preferences:
                preference_context = f"""
User's learning preferences:
- Experience level: {user_preferences.get('experience', 'unknown')}
- Goal: {user_preferences.get('goal', 'general learning')}
- Time commitment: {user_preferences.get('time', 'flexible')}
"""
            
            system_prompt = f"""You are an expert curriculum designer creating personalized learning roadmaps.

LEARNING MODE: {learning_mode.upper()} ({mode_config['name']})
- {mode_config['description']}

RULES:
1. Generate exactly {target_steps} learning steps (between {min_steps}-{max_steps})
2. Each step must be a specific, focused concept
3. Each step title should be searchable on YouTube
4. Order from foundational to more advanced
5. For {video_preference} videos, make queries specific to get concise tutorials
6. Make step titles descriptive but concise
{previous_context}
{preference_context}

RESPOND WITH ONLY VALID JSON in this exact format:
{{
  "learning_mode": "{learning_mode}",
  "depth": {depth_level},
  "topic": "{user_topic}",
  "estimated_time": "X hours",
  "steps": [
    {{"title": "Step Title", "query": "youtube search query", "description": "What you'll learn"}},
    ...
  ]
}}"""

            prompt = f"Create a {learning_mode} learning roadmap for: {user_topic}"
            
            llm_start = time.time()
            response = await call_gemini(prompt, system_prompt)
            llm_latency = (time.time() - llm_start) * 1000
            
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
            
            # Ensure steps are within bounds
            roadmap["steps"] = roadmap["steps"][:max_steps]
            if len(roadmap["steps"]) < min_steps:
                # Pad with generic steps if needed
                while len(roadmap["steps"]) < min_steps:
                    idx = len(roadmap["steps"]) + 1
                    roadmap["steps"].append({
                        "title": f"Advanced {user_topic} Concepts {idx}",
                        "query": f"{user_topic} advanced tutorial part {idx}",
                        "description": f"Deep dive into {user_topic}"
                    })
            
            roadmap["learning_mode"] = learning_mode
            roadmap["mode_config"] = mode_config
            
            # Log quality metrics
            steps_count = len(roadmap["steps"])
            span.set_output({
                "roadmap": roadmap,
                "steps_count": steps_count,
                "learning_mode": learning_mode
            })
            span.log_metric("llm_latency_ms", llm_latency)
            span.log_metric("steps_generated", steps_count)
        
        print(f"[OPIK] Generated {learning_mode} roadmap with {len(roadmap['steps'])} steps for '{user_topic}'")
        
        node_timings = state.get("node_timings", {}) or {}
        node_timings["roadmap_generator"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "llm_latency_ms": llm_latency,
            "steps_count": len(roadmap["steps"]),
            "learning_mode": learning_mode
        }
        
        return {
            **state,
            "roadmap": roadmap,
            "node_timings": node_timings,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        # Fallback roadmap based on learning mode
        mode_config = LEARNING_MODES.get(state.get("learning_mode", "standard"), LEARNING_MODES["standard"])
        fallback_steps = []
        for i in range(mode_config["min_steps"]):
            fallback_steps.append({
                "title": f"{state['user_topic']} - Part {i+1}",
                "query": f"{state['user_topic']} tutorial part {i+1} beginner",
                "description": f"Learn {state['user_topic']} step by step"
            })
        
        fallback_roadmap = {
            "learning_mode": state.get("learning_mode", "standard"),
            "depth": state.get("depth_level", 1),
            "topic": state["user_topic"],
            "estimated_time": "1-2 hours",
            "steps": fallback_steps
        }
        
        node_timings = state.get("node_timings", {}) or {}
        node_timings["roadmap_generator"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "error": str(e),
            "used_fallback": True
        }
        
        return {
            **state,
            "roadmap": fallback_roadmap,
            "node_timings": node_timings,
            "errors": state.get("errors", []) + [f"Roadmap error: {str(e)}"]
        }


# ============================================
# Node 3: Video Fetcher (with OPIK tracing)
# ============================================
async def video_fetcher_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Fetch exactly ONE best video for each roadmap step.
    
    OPIK: Tracks YouTube API calls and video quality metrics
    """
    trace_id = state.get("trace_id")
    node_start = time.time()
    
    try:
        roadmap = state.get("roadmap", {})
        steps = roadmap.get("steps", [])
        
        if not steps:
            return {
                **state,
                "step_videos": [],
                "errors": state.get("errors", []) + ["No steps in roadmap"]
            }
        
        async with create_span_async(
            trace_id,
            "VideoFetcher",
            span_type="tool",
            input_data={"steps_count": len(steps)}
        ) as span:
            step_videos = []
            api_calls = 0
            successful_fetches = 0
            total_api_latency = 0
            
            for i, step in enumerate(steps):
                query = step.get("query", step.get("title", ""))
                title = step.get("title", f"Step {i+1}")
                
                print(f"[OPIK] Finding best video for: {title}")
                
                try:
                    api_start = time.time()
                    video = await fetch_single_best_video(query)
                    api_latency = (time.time() - api_start) * 1000
                    total_api_latency += api_latency
                    api_calls += 1
                    
                    if video:
                        successful_fetches += 1
                        step_videos.append({
                            "step_number": i + 1,
                            "step_title": title,
                            "video": video,
                            "status": "pending",
                            "fetch_latency_ms": api_latency
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
            
            # Log metrics
            span.set_output({
                "videos_fetched": successful_fetches,
                "total_steps": len(steps)
            })
            span.log_metric("api_calls", api_calls)
            span.log_metric("successful_fetches", successful_fetches)
            span.log_metric("avg_api_latency_ms", total_api_latency / api_calls if api_calls else 0)
        
        print(f"[OPIK] Fetched {len([v for v in step_videos if v['video']])} videos for {len(steps)} steps")
        
        node_timings = state.get("node_timings", {}) or {}
        node_timings["video_fetcher"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "api_calls": api_calls,
            "successful_fetches": successful_fetches,
            "total_api_latency_ms": total_api_latency
        }
        
        return {
            **state,
            "step_videos": step_videos,
            "node_timings": node_timings,
            "errors": state.get("errors", [])
        }
    except Exception as e:
        node_timings = state.get("node_timings", {}) or {}
        node_timings["video_fetcher"] = {
            "duration_ms": (time.time() - node_start) * 1000,
            "error": str(e)
        }
        return {
            **state,
            "step_videos": [],
            "node_timings": node_timings,
            "errors": state.get("errors", []) + [f"Video fetch error: {str(e)}"]
        }


# ============================================
# Node 4: Final Response Builder (with OPIK tracing)
# ============================================
async def final_response_node(state: ProgressiveLearningState) -> ProgressiveLearningState:
    """
    Build the final progressive learning response.
    
    OPIK: Compiles final metrics and prepares for evaluation
    """
    trace_id = state.get("trace_id")
    node_start = time.time()
    
    async with create_span_async(
        trace_id,
        "ResponseBuilder",
        span_type="processing",
        input_data={"step_videos_count": len(state.get("step_videos", []))}
    ) as span:
        user_topic = state["user_topic"]
        difficulty = state.get("difficulty", "medium")
        depth_level = state.get("depth_level", 1)
        step_videos = state.get("step_videos", [])
        errors = state.get("errors", [])
        node_timings = state.get("node_timings", {}) or {}
        
        learning_steps = []
        videos_with_content = 0
        
        for sv in step_videos:
            step = {
                "step_number": sv["step_number"],
                "title": sv["step_title"],
                "status": sv["status"]
            }
            
            if sv.get("video"):
                video = sv["video"]
                videos_with_content += 1
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
        
        # Calculate total pipeline timing
        total_duration_ms = sum(
            t.get("duration_ms", 0) for t in node_timings.values()
        )
        
        final_response = {
            "topic": user_topic,
            "difficulty": difficulty,
            "depth_level": depth_level,
            "total_steps": len(learning_steps),
            "learning_steps": learning_steps,
            "can_go_deeper": depth_level < 3,
            "errors": errors if errors else None,
            # OPIK metadata
            "_observability": {
                "trace_id": trace_id,
                "node_timings": node_timings,
                "total_duration_ms": total_duration_ms,
                "videos_found_rate": videos_with_content / len(learning_steps) if learning_steps else 0
            }
        }
        
        span.set_output({
            "total_steps": len(learning_steps),
            "videos_with_content": videos_with_content,
            "has_errors": bool(errors)
        })
        span.log_metric("total_steps", len(learning_steps))
        span.log_metric("videos_found_rate", videos_with_content / len(learning_steps) if learning_steps else 0)
    
    node_timings["response_builder"] = {
        "duration_ms": (time.time() - node_start) * 1000
    }
    
    return {
        **state,
        "final_response": final_response,
        "node_timings": node_timings
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
    workflow.add_node("build_final_response", final_response_node)
    
    workflow.set_entry_point("difficulty_analyzer")
    workflow.add_edge("difficulty_analyzer", "roadmap_generator")
    workflow.add_edge("roadmap_generator", "video_fetcher")
    workflow.add_edge("video_fetcher", "build_final_response")
    workflow.add_edge("build_final_response", END)
    
    return workflow.compile()


progressive_learning_graph = create_progressive_learning_graph()


# ============================================
# Public API Functions (with OPIK integration)
# ============================================
async def generate_learning_plan(
    user_topic: str,
    learning_mode: str = "standard",
    depth_level: int = 1,
    previous_steps: List[str] = None,
    user_preferences: dict = None,
    enable_tracing: bool = True,
    enable_evaluation: bool = True
) -> dict:
    """
    Generate a progressive learning plan with full OPIK tracing.
    
    Args:
        user_topic: The topic to learn
        learning_mode: "quick" (2-4 steps), "standard" (5-8 steps), "comprehensive" (10-15 steps)
        depth_level: Current learning depth (1-3)
        previous_steps: Previously completed steps
        user_preferences: Answers from clarification questions
        enable_tracing: Whether to enable OPIK tracing
        enable_evaluation: Whether to run LLM-as-judge evaluations
        
    Returns:
        Complete learning plan with observability metadata
    """
    # Validate learning mode
    if learning_mode not in LEARNING_MODES:
        learning_mode = "standard"
    
    mode_config = LEARNING_MODES[learning_mode]
    
    # Start OPIK trace
    trace_id = None
    if enable_tracing:
        trace_id = start_trace(
            "GenerateLearningPlan",
            metadata={
                "topic": user_topic,
                "learning_mode": learning_mode,
                "depth_level": depth_level,
                "previous_steps_count": len(previous_steps or []),
                "mode_config": mode_config
            },
            tags=["learning_plan", f"mode_{learning_mode}", f"depth_{depth_level}"]
        )
    
    initial_state: ProgressiveLearningState = {
        "user_topic": user_topic,
        "difficulty": "medium",
        "learning_mode": learning_mode,
        "depth_level": depth_level,
        "previous_steps": previous_steps or [],
        "user_preferences": user_preferences or {},
        "roadmap": {},
        "step_videos": [],
        "current_step": 1,
        "final_response": {},
        "errors": [],
        "trace_id": trace_id,
        "node_timings": {}
    }
    
    try:
        final_state = await progressive_learning_graph.ainvoke(initial_state)
        result = final_state.get("final_response", {})
        
        # Add learning mode info to result
        result["learning_mode"] = learning_mode
        result["mode_config"] = mode_config
        
        # Run evaluations if enabled
        if enable_evaluation and trace_id:
            try:
                from app.evals.judges import evaluate_learning_plan
                eval_scores = await evaluate_learning_plan(result, trace_id)
                result["_evaluations"] = eval_scores
            except ImportError:
                # Evaluations module not yet loaded
                pass
            except Exception as e:
                print(f"[OPIK] Evaluation failed: {e}")
        
        # End trace with success
        if trace_id:
            end_trace(
                trace_id,
                output={
                    "topic": user_topic,
                    "learning_mode": learning_mode,
                    "steps_count": result.get("total_steps", 0),
                    "difficulty": result.get("difficulty"),
                    "has_errors": bool(result.get("errors"))
                },
                status="success" if not result.get("errors") else "partial"
            )
        
        return result
        
    except Exception as e:
        if trace_id:
            end_trace(trace_id, output={"error": str(e)}, status="error")
        raise


async def generate_deeper_roadmap(user_topic: str, completed_steps: List[str], current_depth: int, learning_mode: str = "standard") -> dict:
    """Generate a deeper roadmap after user completes current level."""
    new_depth = current_depth + 1
    
    if new_depth > 3:
        return {
            "topic": user_topic,
            "message": "Congratulations! You've mastered this topic at all levels!",
            "completed": True,
            "total_steps_completed": len(completed_steps)
        }
    
    return await generate_learning_plan(
        user_topic=user_topic,
        learning_mode=learning_mode,
        depth_level=new_depth,
        previous_steps=completed_steps
    )


# Alias for backward compatibility
learning_graph = progressive_learning_graph
