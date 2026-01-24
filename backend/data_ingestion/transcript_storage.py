"""
Transcript storage functions for Supabase.
"""

from typing import Optional, Dict
from app.supabase_client import get_supabase_client
from postgrest.exceptions import APIError


class TranscriptStorageError(Exception):
    """Custom exception for transcript storage errors."""
    pass


def save_transcript(video_id: str, text: str) -> Dict:
    """
    Save a transcript to Supabase.
    
    Args:
        video_id: YouTube video ID
        text: Cleaned transcript text
        
    Returns:
        Dict with transcript data (id, video_id, created_at)
        
    Raises:
        TranscriptStorageError: If save fails or duplicate exists
    """
    supabase = get_supabase_client()
    
    try:
        # Check if transcript already exists
        existing = supabase.table('transcripts').select('id').eq('video_id', video_id).execute()
        
        if existing.data:
            raise TranscriptStorageError(f"Transcript already exists for video_id: {video_id}")
        
        # Insert new transcript
        result = supabase.table('transcripts').insert({
            'video_id': video_id,
            'raw_text': text
        }).execute()
        
        if not result.data:
            raise TranscriptStorageError("Failed to save transcript: no data returned")
        
        return result.data[0]
        
    except APIError as e:
        # Handle Supabase API errors
        if 'duplicate key' in str(e).lower():
            raise TranscriptStorageError(f"Transcript already exists for video_id: {video_id}")
        raise TranscriptStorageError(f"Database error: {str(e)}")
    except TranscriptStorageError:
        # Re-raise our custom errors
        raise
    except Exception as e:
        raise TranscriptStorageError(f"Unexpected error saving transcript: {str(e)}")


def get_transcript(video_id: str) -> Optional[Dict]:
    """
    Retrieve a transcript from Supabase by video_id.
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        Transcript data dict or None if not found
    """
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('transcripts').select('*').eq('video_id', video_id).execute()
        
        if result.data:
            return result.data[0]
        return None
        
    except Exception as e:
        raise TranscriptStorageError(f"Error retrieving transcript: {str(e)}")
