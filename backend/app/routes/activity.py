"""
Activity Tracking API
Logs time spent per feature and returns weekly summaries
for the dashboard Hours Activity chart.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
import traceback

from app.db.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/activity", tags=["Activity"])


# ── Schemas ──────────────────────────────────────────────

class ActivityHeartbeat(BaseModel):
    user_id: str
    feature: str           # 'resume', 'roadmap', 'skills', 'interview', 'alumni', 'dashboard'
    seconds: int = 30      # seconds since last heartbeat (default 30s)


class DailyActivity(BaseModel):
    day: str               # ISO date  e.g. '2026-02-09'
    day_label: str         # short label e.g. 'Mo'
    total_seconds: int
    hours: float
    features: dict         # { 'resume': seconds, 'roadmap': seconds, ... }


class WeeklySummary(BaseModel):
    success: bool
    days: List[DailyActivity]
    total_hours: float
    most_active_feature: Optional[str] = None


# ── POST /api/activity/heartbeat ─────────────────────────

@router.post("/heartbeat")
async def log_heartbeat(body: ActivityHeartbeat):
    """
    Called by the frontend every ~30 seconds while user is
    active on a feature page.  Upserts the row for
    (user_id, feature, today) incrementing seconds_spent.
    """
    try:
        sb = get_supabase_client()
        today = date.today().isoformat()

        # Try to fetch existing row
        existing = (
            sb.table("user_activity_log")
            .select("id, seconds_spent, sessions")
            .eq("user_id", body.user_id)
            .eq("feature", body.feature)
            .eq("activity_date", today)
            .execute()
        )

        if existing.data and len(existing.data) > 0:
            row = existing.data[0]
            new_seconds = row["seconds_spent"] + body.seconds
            sb.table("user_activity_log").update({
                "seconds_spent": new_seconds,
                "updated_at": "now()",
            }).eq("id", row["id"]).execute()
        else:
            sb.table("user_activity_log").insert({
                "user_id": body.user_id,
                "feature": body.feature,
                "activity_date": today,
                "seconds_spent": body.seconds,
                "sessions": 1,
            }).execute()

        return {"success": True}

    except Exception as e:
        # Heartbeats are fire-and-forget; don't crash the client
        print(f"[activity] heartbeat error: {e}")
        return {"success": False, "error": str(e)}


# ── GET /api/activity/weekly/{user_id} ───────────────────

@router.get("/weekly/{user_id}", response_model=WeeklySummary)
async def get_weekly_activity(user_id: str):
    """
    Returns the last 7 days of activity broken down by day
    and feature, used for the dashboard bar chart.
    """
    try:
        sb = get_supabase_client()
        today = date.today()
        week_ago = today - timedelta(days=6)

        rows = (
            sb.table("user_activity_log")
            .select("feature, activity_date, seconds_spent")
            .eq("user_id", user_id)
            .gte("activity_date", week_ago.isoformat())
            .lte("activity_date", today.isoformat())
            .execute()
        )

        # Build a map: date -> { feature -> seconds }
        day_map = {}
        for i in range(7):
            d = week_ago + timedelta(days=i)
            day_map[d.isoformat()] = {}

        feature_totals = {}
        for row in (rows.data or []):
            d = row["activity_date"]
            f = row["feature"]
            s = row["seconds_spent"]
            if d in day_map:
                day_map[d][f] = day_map[d].get(f, 0) + s
            feature_totals[f] = feature_totals.get(f, 0) + s

        DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

        days = []
        total_seconds = 0
        for i in range(7):
            d = week_ago + timedelta(days=i)
            iso = d.isoformat()
            features = day_map.get(iso, {})
            day_total = sum(features.values())
            total_seconds += day_total
            # Python weekday: 0=Mon ... 6=Sun
            label = DAY_LABELS[d.weekday()]
            days.append(DailyActivity(
                day=iso,
                day_label=label,
                total_seconds=day_total,
                hours=round(day_total / 3600, 2),
                features=features,
            ))

        most_active = max(feature_totals, key=feature_totals.get) if feature_totals else None

        return WeeklySummary(
            success=True,
            days=days,
            total_hours=round(total_seconds / 3600, 2),
            most_active_feature=most_active,
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
