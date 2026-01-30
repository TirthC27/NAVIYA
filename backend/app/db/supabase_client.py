"""
LearnTube AI - Supabase Client
Database connection and client initialization
"""

from supabase import create_client, Client
from app.config import settings


# Initialize Supabase client
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses singleton pattern to reuse connection.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase URL and Key must be configured in .env")
        
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    return _supabase_client


class SupabaseError(Exception):
    """Custom exception for Supabase operations"""
    pass


# Test connection
if __name__ == "__main__":
    try:
        client = get_supabase_client()
        print("✅ Supabase client initialized successfully!")
        print(f"   URL: {settings.SUPABASE_URL}")
    except Exception as e:
        print(f"❌ Error: {e}")
