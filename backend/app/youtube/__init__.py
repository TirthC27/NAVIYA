"""
Naviya AI - YouTube Module
YouTube API integration for video data retrieval and processing
"""

from app.youtube.client import (
    search_videos,
    get_video_details,
    fetch_single_best_video,
    YouTubeError
)

__all__ = [
    "search_videos",
    "get_video_details",
    "fetch_single_best_video",
    "YouTubeError"
]
