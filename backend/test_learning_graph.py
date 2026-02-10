"""
Test LangGraph Learning Plan Orchestration
"""
import asyncio
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agents.learning_graph import generate_learning_plan


async def test():
    print("=" * 60)
    print("Naviya AI - LangGraph Learning Plan Test")
    print("=" * 60)
    
    user_topic = "Graph Algorithms"
    print(f"\n📚 Generating learning plan for: {user_topic}")
    print("-" * 40)
    
    result = await generate_learning_plan(user_topic)
    
    print(f"\n✅ Learning Plan Generated!")
    print(f"📊 Roadmap Items: {result['roadmap_count']}")
    print(f"🎬 Total Videos: {result['total_videos']}")
    print("\n" + "=" * 60)
    
    for item in result["learning_plan"]:
        print(f"\n{item['order']}. {item['subtopic']}")
        print("-" * 40)
        
        if item["videos"]:
            for v in item["videos"]:
                title = v['title'][:50] + "..." if len(v['title']) > 50 else v['title']
                print(f"   📺 {title}")
                print(f"      ⏱️ {v['duration']} | 👁️ {v['views']:,} views")
                print(f"      🔗 {v['url']}")
        else:
            print("   No videos found")
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")


if __name__ == "__main__":
    asyncio.run(test())
