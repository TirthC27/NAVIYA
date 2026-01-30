"""
Test YouTube Client
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.youtube.client import get_videos_for_topic, YouTubeError


async def test():
    print("=" * 60)
    print("LearnTube AI - YouTube Client Test")
    print("=" * 60)
    
    topic = "BFS Breadth First Search algorithm"
    print(f"\n🔍 Searching for: {topic}")
    print("-" * 40)
    
    try:
        videos = await get_videos_for_topic(topic, max_results=5)
        
        if not videos:
            print("No videos found!")
            return
        
        print(f"\n📺 Found {len(videos)} videos:\n")
        
        for i, video in enumerate(videos, 1):
            print(f"{i}. {video['title']}")
            print(f"   📺 Channel: {video['channel_title']}")
            print(f"   ⏱️  Duration: {video['duration_formatted']}")
            print(f"   👁️  Views: {video['view_count']:,}")
            print(f"   🔗 {video['url']}")
            print()
        
        print("=" * 60)
        print("✅ Test completed!")
        
    except YouTubeError as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(test())
