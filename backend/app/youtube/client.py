"""
LearnTube AI - YouTube Client
Fetches ONE best video per learning step with strict quality filters
"""

import httpx
import re
from typing import Optional, List, Dict
from app.config import settings


class YouTubeError(Exception):
    """Custom exception for YouTube API errors"""
    pass


YOUTUBE_API_KEY = settings.YOUTUBE_API_KEY
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def parse_duration(duration: str) -> int:
    """Parse ISO 8601 duration to seconds"""
    if not duration:
        return 0
    
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds


def format_duration(seconds: int) -> str:
    """Format seconds to MM:SS or HH:MM:SS"""
    if seconds < 3600:
        return f"{seconds // 60}:{seconds % 60:02d}"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}:{minutes:02d}:{secs:02d}"


async def search_videos(query: str, max_results: int = 10) -> List[str]:
    """
    Search YouTube for videos matching the query.
    Returns list of video IDs.
    """
    if not YOUTUBE_API_KEY:
        raise YouTubeError("YouTube API key not configured")
    
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": YOUTUBE_API_KEY,
        "videoDuration": "medium",  # Filter: 4-20 minutes
        "videoEmbeddable": "true",
        "relevanceLanguage": "en",
        "order": "relevance"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(YOUTUBE_SEARCH_URL, params=params)
        
        if response.status_code != 200:
            raise YouTubeError(f"YouTube search failed: {response.status_code}")
        
        data = response.json()
        video_ids = [item["id"]["videoId"] for item in data.get("items", [])]
        
        return video_ids


async def get_video_details(video_ids: List[str]) -> List[Dict]:
    """
    Get detailed metadata for videos including duration, views, captions.
    """
    if not video_ids:
        return []
    
    params = {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "key": YOUTUBE_API_KEY
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(YOUTUBE_VIDEOS_URL, params=params)
        
        if response.status_code != 200:
            raise YouTubeError(f"YouTube video details failed: {response.status_code}")
        
        data = response.json()
        videos = []
        
        for item in data.get("items", []):
            video_id = item["id"]
            snippet = item.get("snippet", {})
            content = item.get("contentDetails", {})
            stats = item.get("statistics", {})
            
            duration_seconds = parse_duration(content.get("duration", "PT0S"))
            
            videos.append({
                "video_id": video_id,
                "title": snippet.get("title", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "description": snippet.get("description", "")[:200],
                "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "duration_seconds": duration_seconds,
                "duration_formatted": format_duration(duration_seconds),
                "view_count": int(stats.get("viewCount", 0)),
                "like_count": int(stats.get("likeCount", 0)),
                "has_captions": content.get("caption", "false") == "true",
                "url": f"https://www.youtube.com/watch?v={video_id}"
            })
        
        return videos


def calculate_video_score(video: Dict, query: str) -> float:
    """
    Calculate quality score for a video.
    
    Scoring criteria:
    - Duration: 2-5 minutes preferred (highest score)
    - Has captions: +20 points
    - Views: logarithmic bonus
    - Title relevance: bonus if query words in title
    - Avoid shorts: penalize < 1 min
    """
    score = 0.0
    
    duration = video.get("duration_seconds", 0)
    
    # Duration scoring (prefer 2-5 minutes as specified)
    if duration < 60:
        # Too short (likely a short) - heavy penalty
        score -= 50
    elif 120 <= duration <= 300:
        # Ideal range: 2-5 minutes - highest score
        score += 40
    elif 300 < duration <= 600:
        # 5-10 minutes - good
        score += 30
    elif 600 < duration <= 1200:
        # 10-20 minutes - acceptable
        score += 20
    elif 60 <= duration < 120:
        # 1-2 minutes - okay but short
        score += 10
    else:
        # Very long videos - some penalty
        score += 5
    
    # Captions bonus (as specified)
    if video.get("has_captions"):
        score += 20
    
    # View count bonus (logarithmic to avoid huge channels dominating)
    views = video.get("view_count", 0)
    if views > 0:
        import math
        score += min(math.log10(views) * 3, 25)
    
    # Title relevance - check if query words appear in title
    title = video.get("title", "").lower()
    query_words = query.lower().split()
    matching_words = sum(1 for word in query_words if word in title)
    score += matching_words * 5
    
    # Penalize clickbait patterns
    clickbait_patterns = ["#shorts", "short", "tiktok", "🔥🔥🔥", "!!!"]
    for pattern in clickbait_patterns:
        if pattern in title.lower():
            score -= 15
    
    # Bonus for educational keywords
    educational_keywords = ["tutorial", "explained", "learn", "guide", "course", "beginner", "basics"]
    for keyword in educational_keywords:
        if keyword in title.lower():
            score += 5
            break
    
    return score


async def fetch_single_best_video(query: str) -> Optional[Dict]:
    """
    Fetch the SINGLE BEST video for a learning step.
    
    This is the main function used by the progressive learning system.
    Returns exactly one video that best matches the query with quality filters.
    """
    try:
        # Search for candidates
        video_ids = await search_videos(query, max_results=15)
        
        if not video_ids:
            print(f"⚠️ No videos found for: {query}")
            return None
        
        # Get detailed metadata
        videos = await get_video_details(video_ids)
        
        if not videos:
            return None
        
        # Filter and score videos
        valid_videos = []
        for video in videos:
            duration = video.get("duration_seconds", 0)
            
            # Strict filters as specified:
            # - Duration > 2 min (120 seconds)
            # - Duration < 5 min preferred, but allow up to 20 min
            # - Avoid shorts (< 60 seconds)
            if duration >= 120:  # At least 2 minutes
                video["quality_score"] = calculate_video_score(video, query)
                valid_videos.append(video)
        
        if not valid_videos:
            # Fallback: accept videos 1-2 minutes if nothing else
            for video in videos:
                duration = video.get("duration_seconds", 0)
                if duration >= 60:
                    video["quality_score"] = calculate_video_score(video, query)
                    valid_videos.append(video)
        
        if not valid_videos:
            print(f"⚠️ No valid videos after filtering for: {query}")
            return None
        
        # Sort by score and return the best one
        valid_videos.sort(key=lambda x: x["quality_score"], reverse=True)
        best_video = valid_videos[0]
        
        print(f"✅ Best video for '{query}': {best_video['title'][:50]}... (score: {best_video['quality_score']:.1f})")
        
        return best_video
        
    except Exception as e:
        print(f"❌ Error fetching video for '{query}': {e}")
        raise YouTubeError(f"Failed to fetch video: {str(e)}")


# Legacy functions for backwards compatibility
async def get_videos_for_topic(topic: str, max_results: int = 3) -> List[Dict]:
    """Legacy function - returns multiple videos (for backwards compatibility)"""
    video_ids = await search_videos(f"{topic} tutorial", max_results=max_results * 2)
    videos = await get_video_details(video_ids)
    
    for video in videos:
        video["quality_score"] = calculate_video_score(video, topic)
    
    videos.sort(key=lambda x: x["quality_score"], reverse=True)
    return videos[:max_results]


async def search_educational_videos(query: str, max_results: int = 5) -> List[Dict]:
    """Legacy function - search with educational focus"""
    return await get_videos_for_topic(query, max_results)
