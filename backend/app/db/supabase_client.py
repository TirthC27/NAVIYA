"""
Naviya AI - Supabase Client
Database connection and client initialization
"""

import os
from typing import Optional
from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Optional[Client]:
    """
    Create a fresh Supabase client instance.
    
    Returns:
        Supabase Client instance or None if credentials are missing
        
    Note:
        For Cloud Run compatibility, this returns None instead of crashing
        when credentials are not configured. Callers should handle None.
    """
    supabase_url = settings.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
    supabase_key = settings.SUPABASE_KEY or os.getenv("SUPABASE_KEY", "")
    
    if not supabase_url or not supabase_key:
        # Don't crash at import time - return None and let callers handle it
        return None
    
    try:
        # Create a fresh client each time to avoid connection pooling issues
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"[WARN] Failed to create Supabase client: {e}")
        return None


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
        print("[OK] Supabase client initialized successfully!")
        print(f"   URL: {settings.SUPABASE_URL[:50]}...")
    except Exception as e:
        print(f"[ERR] Error: {e}")
