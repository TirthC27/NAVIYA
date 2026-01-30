"""
LearnTube AI - Supabase Client
Database connection and client initialization
"""

import os
from typing import Optional
from supabase import create_client, Client
from app.config import settings


# Initialize Supabase client
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses singleton pattern to reuse connection.
    
    Returns:
        Supabase Client instance
        
    Raises:
        ValueError: If Supabase credentials are not configured
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = settings.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
        supabase_key = settings.SUPABASE_KEY or os.getenv("SUPABASE_KEY", "")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "Supabase URL and Key must be configured. "
                "Set SUPABASE_URL and SUPABASE_KEY in your .env file."
            )
        
        _supabase_client = create_client(supabase_url, supabase_key)
    
    return _supabase_client


def reset_client():
    """Reset the Supabase client (useful for testing)"""
    global _supabase_client
    _supabase_client = None


class SupabaseError(Exception):
    """Custom exception for Supabase operations"""
    def __init__(self, message: str, operation: str = None, details: dict = None):
        self.message = message
        self.operation = operation
        self.details = details or {}
        super().__init__(self.message)


# Anonymous user ID for users without accounts
ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


# Test connection
if __name__ == "__main__":
    try:
        client = get_supabase_client()
        print("✅ Supabase client initialized successfully!")
        print(f"   URL: {settings.SUPABASE_URL[:50]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
