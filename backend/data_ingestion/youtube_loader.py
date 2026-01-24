"""
YouTube Transcript Loader
Fetches and cleans YouTube video transcripts.
"""

import re
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable
)


class TranscriptError(Exception):
    """Custom exception for transcript-related errors."""
    pass


def fetch_transcript(video_id: str) -> str:
    """
    Fetch transcript for a YouTube video.
    
    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        
    Returns:
        Raw transcript text with timestamps
        
    Raises:
        TranscriptError: If transcript is unavailable
    """
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Combine all transcript segments
        raw_text = " ".join([entry['text'] for entry in transcript_list])
        return raw_text
        
    except TranscriptsDisabled:
        raise TranscriptError(f"Transcripts are disabled for video: {video_id}")
    except NoTranscriptFound:
        raise TranscriptError(f"No transcript found for video: {video_id}")
    except VideoUnavailable:
        raise TranscriptError(f"Video unavailable: {video_id}")
    except Exception as e:
        raise TranscriptError(f"Failed to fetch transcript for {video_id}: {str(e)}")


def clean_transcript(raw_text: str) -> str:
    """
    Clean transcript text by removing filler words and extra whitespace.
    
    Args:
        raw_text: Raw transcript text
        
    Returns:
        Cleaned transcript text
    """
    text = raw_text
    
    # Remove common filler words and sounds
    fillers = [
        r'\[Music\]',
        r'\[Applause\]',
        r'\[Laughter\]',
        r'\(Music\)',
        r'\(Applause\)',
        r'\(Laughter\)',
        r'\buh\b',
        r'\bum\b',
        r'\bhmm\b',
        r'\bhuh\b'
    ]
    
    for filler in fillers:
        text = re.sub(filler, '', text, flags=re.IGNORECASE)
    
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text


def load_youtube_transcript(video_id: str) -> str:
    """
    Fetch and clean a YouTube transcript.
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        Cleaned transcript text ready for storage
        
    Raises:
        TranscriptError: If transcript cannot be loaded
    """
    raw_text = fetch_transcript(video_id)
    cleaned_text = clean_transcript(raw_text)
    
    if not cleaned_text:
        raise TranscriptError(f"Transcript is empty after cleaning for video: {video_id}")
    
    return cleaned_text
