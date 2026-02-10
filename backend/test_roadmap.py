"""
Test RAG Roadmap with actual LLM fallback
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.rag.roadmap import get_learning_roadmap, get_available_topics


async def test():
    print("=" * 60)
    print("Naviya AI - RAG Roadmap Module Test")
    print("=" * 60)
    
    # Test 1: Static knowledge base lookup
    print("\n📚 Test 1: Static KB - 'Graph Algorithms'")
    print("-" * 40)
    result = await get_learning_roadmap("Graph Algorithms")
    for i, subtopic in enumerate(result, 1):
        print(f"  {i}. {subtopic}")
    
    # Test 2: Partial match
    print("\n📚 Test 2: Partial Match - 'dynamic programming'")
    print("-" * 40)
    result = await get_learning_roadmap("dynamic programming")
    for i, subtopic in enumerate(result, 1):
        print(f"  {i}. {subtopic}")
    
    # Test 3: LLM fallback (topic not in KB)
    print("\n🤖 Test 3: LLM Fallback - 'Kubernetes'")
    print("-" * 40)
    result = await get_learning_roadmap("Kubernetes")
    for i, subtopic in enumerate(result, 1):
        print(f"  {i}. {subtopic}")
    
    # Test 4: Another LLM fallback
    print("\n🤖 Test 4: LLM Fallback - 'Docker'")
    print("-" * 40)
    result = await get_learning_roadmap("Docker")
    for i, subtopic in enumerate(result, 1):
        print(f"  {i}. {subtopic}")
    
    # Show available topics
    print("\n📋 Available Topics in Knowledge Base:")
    print("-" * 40)
    for topic in get_available_topics():
        print(f"  • {topic}")
    
    print("\n" + "=" * 60)
    print("✅ Tests completed!")


if __name__ == "__main__":
    asyncio.run(test())
