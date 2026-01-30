"""
LearnTube AI - Database Module
Supabase integration for data persistence
"""

from app.db.supabase_client import get_supabase_client, SupabaseError
from app.db.queries import (
    save_learning_plan,
    get_learning_plan,
    get_user_plans,
    get_all_plans,
    save_video_progress,
    get_user_progress,
    get_plan_progress,
    delete_learning_plan
)

__all__ = [
    "get_supabase_client",
    "SupabaseError",
    "save_learning_plan",
    "get_learning_plan",
    "get_user_plans",
    "get_all_plans",
    "save_video_progress",
    "get_user_progress",
    "get_plan_progress",
    "delete_learning_plan"
]
