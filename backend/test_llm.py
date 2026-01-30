"""
Test script for Gemini LLM connector
"""
import asyncio
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agents.llm import call_gemini


async def test_gemini():
    prompt = "Generate 3 search queries for learning BFS"
    print(f"Testing Gemini LLM via OpenRouter")
    print(f"=" * 50)
    print(f"Prompt: {prompt}")
    print(f"=" * 50)
    print(f"\nResponse:\n")
    
    try:
        result = await call_gemini(prompt)
        print(result)
        print(f"\n{'=' * 50}")
        print("✅ Test successful!")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_gemini())
