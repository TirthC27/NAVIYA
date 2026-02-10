"""
Naviya AI - RAG Roadmap Module
Returns syllabus subtopics for a given learning topic
"""

import json
import os
from typing import Optional
from app.agents.llm import call_gemini, LLMError

# Try to import vector RAG (optional)
try:
    from app.rag.vector_rag import get_vector_rag
    VECTOR_RAG_AVAILABLE = True
except ImportError:
    VECTOR_RAG_AVAILABLE = False


# Path to the static knowledge base
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
ROADMAPS_FILE = os.path.join(DATA_DIR, "roadmaps.json")


def load_roadmaps() -> dict:
    """Load roadmaps from the static JSON knowledge base"""
    try:
        with open(ROADMAPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def search_roadmap(topic: str, roadmaps: dict) -> Optional[list[str]]:
    """
    Search for a topic in the knowledge base
    Uses case-insensitive partial matching
    """
    topic_lower = topic.lower().strip()
    
    # Exact match first
    if topic_lower in roadmaps:
        return roadmaps[topic_lower]["subtopics"]
    
    # Partial match
    for key, value in roadmaps.items():
        if topic_lower in key or key in topic_lower:
            return value["subtopics"]
        # Also check the title
        if topic_lower in value["title"].lower():
            return value["subtopics"]
    
    return None


async def generate_roadmap_with_llm(topic: str) -> list[str]:
    """
    Generate a learning roadmap dynamically using Gemini LLM
    """
    system_prompt = """You are an expert curriculum designer. 
When given a topic, generate a structured learning roadmap with 5-8 subtopics.
Return ONLY a JSON array of strings, nothing else.
Example format: ["Subtopic 1", "Subtopic 2", "Subtopic 3"]"""

    prompt = f"""Generate a learning roadmap for: {topic}

Return only a JSON array of 5-8 subtopics in logical learning order.
No explanations, just the JSON array."""

    try:
        response = await call_gemini(prompt, system_prompt)
        
        # Clean the response - remove markdown code blocks if present
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        # Parse JSON
        subtopics = json.loads(response)
        
        if isinstance(subtopics, list) and all(isinstance(s, str) for s in subtopics):
            return subtopics
        else:
            raise ValueError("Invalid response format")
            
    except (json.JSONDecodeError, LLMError, ValueError) as e:
        # Fallback: return a generic roadmap structure
        return [
            f"Introduction to {topic}",
            f"Core Concepts of {topic}",
            f"Practical Applications",
            f"Advanced Topics",
            f"Projects and Practice"
        ]


async def get_learning_roadmap(topic: str) -> list[str]:
    """
    Get a learning roadmap for the given topic.
    
    Priority: Vector RAG > Static KB > LLM Generation
    
    Args:
        topic: The learning topic to get roadmap for
        
    Returns:
        List of subtopics in the learning roadmap
    """
    
    # Try vector RAG first (if available)
    if VECTOR_RAG_AVAILABLE:
        try:
            vector_rag = get_vector_rag()
            result = vector_rag.get_roadmap_for_topic(topic)
            if result and result.get('subtopics'):
                print(f"[OK] Found roadmap in Vector DB for '{topic}'")
                return result['subtopics']
        except Exception as e:
            print(f"[WARN] Vector RAG error: {e}")
    
    # Load static roadmaps
    roadmaps = load_roadmaps()
    
    # Search in knowledge base
    subtopics = search_roadmap(topic, roadmaps)
    
    if subtopics:
        return subtopics
    
    # Generate dynamically with LLM
    return await generate_roadmap_with_llm(topic)


def get_learning_roadmap_sync(topic: str) -> list[str]:
    """
    Synchronous version - only searches static knowledge base.
    Use async version for LLM fallback.
    """
    roadmaps = load_roadmaps()
    subtopics = search_roadmap(topic, roadmaps)
    
    if subtopics:
        return subtopics
    
    # Return placeholder for sync version
    return [
        f"Introduction to {topic}",
        f"Core Concepts of {topic}",
        f"Practical Applications",
        f"Advanced Topics",
        f"Projects and Practice"
    ]


def get_available_topics() -> list[str]:
    """Get list of all available topics in the knowledge base"""
    roadmaps = load_roadmaps()
    return [v["title"] for v in roadmaps.values()]


# Test function
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("=" * 60)
        print("Naviya AI - RAG Roadmap Module Test")
        print("=" * 60)
        
        # Test 1: Static knowledge base lookup
        print("\n[DOCS] Test 1: Static KB - 'Graph Algorithms'")
        print("-" * 40)
        result = await get_learning_roadmap("Graph Algorithms")
        for i, subtopic in enumerate(result, 1):
            print(f"  {i}. {subtopic}")
        
        # Test 2: Partial match
        print("\n[DOCS] Test 2: Partial Match - 'DP'")
        print("-" * 40)
        result = await get_learning_roadmap("dynamic programming")
        for i, subtopic in enumerate(result, 1):
            print(f"  {i}. {subtopic}")
        
        # Test 3: LLM fallback (topic not in KB)
        print("\n[BOT] Test 3: LLM Fallback - 'Kubernetes'")
        print("-" * 40)
        result = await get_learning_roadmap("Kubernetes")
        for i, subtopic in enumerate(result, 1):
            print(f"  {i}. {subtopic}")
        
        # Show available topics
        print("\n[LIST] Available Topics in Knowledge Base:")
        print("-" * 40)
        for topic in get_available_topics():
            print(f"  • {topic}")
        
        print("\n" + "=" * 60)
        print("[OK] Tests completed!")
    
    asyncio.run(test())
