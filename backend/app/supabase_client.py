import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = create_client(supabase_url, supabase_key)


def get_supabase_client() -> Client:
    """Get configured Supabase client"""
    return supabase
