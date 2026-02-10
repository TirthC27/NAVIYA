"""
Naviya AI - Database Module
Supabase integration for data persistence
"""

from app.db.supabase_client import get_supabase_client, SupabaseError, ANONYMOUS_USER_ID
from app.db.queries_v2 import (
    # User operations
    get_or_create_user,
    # Learning plan operations
    create_learning_plan,
    add_roadmap_steps,
    attach_video_to_step,
    mark_step_completed,
    get_learning_plan,
    get_user_plans,
    # Feedback operations
    submit_feedback,
    get_video_feedback,
    # Evaluation operations
    save_eval_run,
    get_observability_summary,
    # Prompt operations
    save_prompt_version,
    get_active_prompt,
    # Helper
    save_full_learning_plan
)

__all__ = [
    "get_supabase_client",
    "SupabaseError",
    "ANONYMOUS_USER_ID",
    # User
    "get_or_create_user",
    # Plans
    "create_learning_plan",
    "add_roadmap_steps",
    "attach_video_to_step",
    "mark_step_completed",
    "get_learning_plan",
    "get_user_plans",
    # Feedback
    "submit_feedback",
    "get_video_feedback",
    # Evals
    "save_eval_run",
    "get_observability_summary",
    # Prompts
    "save_prompt_version",
    "get_active_prompt",
    # Helper
    "save_full_learning_plan"
]
