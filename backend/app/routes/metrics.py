"""
Naviya AI - Metrics Routes
FastAPI endpoints for observability and metrics dashboard
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timedelta

from app.db.queries_v2 import (
    get_observability_summary,
    save_eval_run,
    SupabaseError
)
from app.db.supabase_client import get_supabase_client
from app.observability.opik_client import (
    get_dashboard_stats,
    get_metrics_buffer,
    get_all_active_traces,
)


router = APIRouter(prefix="/metrics", tags=["Metrics & Observability"])


# ============================================
# ENDPOINTS
# ============================================

@router.get("/summary")
async def get_metrics_summary():
    """
    GET /metrics/summary
    
    Get observability metrics summary for the dashboard.
    """
    try:
        summary = await get_observability_summary()
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "data": summary
        }
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "data": {
                "eval_metrics": {},
                "feedback_metrics": {},
                "plan_metrics": {}
            }
        }


@router.get("/evals")
async def get_eval_runs(
    plan_id: Optional[str] = None,
    limit: int = 50
):
    """
    GET /metrics/evals
    
    Get evaluation run history.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("eval_runs").select("*")
        
        if plan_id:
            query = query.eq("plan_id", plan_id)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "total": len(result.data or []),
            "evals": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get eval runs: {str(e)}")


@router.get("/feedback")
async def get_all_feedback(limit: int = 100):
    """
    GET /metrics/feedback
    
    Get recent feedback entries.
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("feedback").select(
            "*, videos(title, video_id)"
        ).order("created_at", desc=True).limit(limit).execute()
        
        return {
            "success": True,
            "total": len(result.data or []),
            "feedback": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")


@router.get("/dashboard")
async def get_full_dashboard():
    """
    GET /metrics/dashboard
    
    Get comprehensive dashboard data.
    """
    summary = {}
    recent_evals = []
    recent_feedback = []
    trending_topics = []
    plans_today_count = 0

    try:
        supabase = get_supabase_client()
    except Exception:
        supabase = None

    if supabase:
        try:
            summary = await get_observability_summary()
        except Exception:
            pass

        try:
            evals_result = supabase.table("eval_runs").select("*").order("created_at", desc=True).limit(10).execute()
            recent_evals = evals_result.data or []
        except Exception:
            pass

        try:
            feedback_result = supabase.table("feedback").select(
                "id, rating, created_at"
            ).order("created_at", desc=True).limit(10).execute()
            recent_feedback = feedback_result.data or []
        except Exception:
            pass

        try:
            topics_result = supabase.table("learning_plans").select(
                "topic, learning_mode, created_at"
            ).order("created_at", desc=True).limit(10).execute()
            trending_topics = [t["topic"] for t in (topics_result.data or [])]
        except Exception:
            pass

        try:
            today = datetime.utcnow().date()
            plans_today = supabase.table("learning_plans").select("id").gte(
                "created_at", today.isoformat()
            ).execute()
            plans_today_count = len(plans_today.data or [])
        except Exception:
            pass

    today = datetime.utcnow().date()
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "summary": summary,
        "recent_evals": recent_evals,
        "recent_feedback": recent_feedback,
        "trending_topics": trending_topics,
        "daily_stats": {
            "plans_created_today": plans_today_count,
            "date": today.isoformat()
        }
    }


@router.get("/prompts")
async def get_prompt_versions(prompt_name: Optional[str] = None):
    """
    GET /metrics/prompts
    
    Get prompt version history for OPIK experiments.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("prompt_versions").select("*")
        
        if prompt_name:
            query = query.eq("prompt_name", prompt_name)
        
        result = query.order("created_at", desc=True).execute()
        
        return {
            "success": True,
            "prompts": result.data or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompts: {str(e)}")


@router.get("/opik-stats")
async def get_opik_stats():
    """
    GET /metrics/opik-stats
    
    Get real-time Opik tracing stats from in-memory buffer.
    Returns aggregated stats across all instrumented agents.
    """
    try:
        stats = get_dashboard_stats()
        active = get_all_active_traces()
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "stats": stats,
            "active_traces": active,
            "active_count": len(active),
        }
    except Exception as e:
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "stats": {"message": "No traces recorded yet"},
            "active_traces": [],
            "active_count": 0,
        }


@router.get("/traces")
async def get_trace_history(limit: int = 50):
    """
    GET /metrics/traces
    
    Get completed trace history from Opik in-memory buffer.
    Returns per-trace details: name, duration, status, spans, metrics, feedback.
    """
    try:
        buffer = get_metrics_buffer()
        traces = buffer[-limit:] if len(buffer) > limit else buffer
        traces = list(reversed(traces))  # Most recent first

        # Sanitize: only include JSON-safe fields
        safe_traces = []
        for t in traces:
            safe_traces.append({
                "id": t.get("id", ""),
                "name": t.get("name", "unknown"),
                "start_time": t.get("start_time"),
                "start_datetime": t.get("start_datetime", ""),
                "end_time": t.get("end_time"),
                "duration": t.get("duration", 0),
                "status": t.get("status", "unknown"),
                "output": t.get("output"),
                "metadata": t.get("metadata", {}),
                "tags": t.get("tags", []),
                "spans": [
                    {
                        "id": s.get("id", ""),
                        "name": s.get("name", ""),
                        "type": s.get("type", "general"),
                        "duration": s.get("duration", 0),
                    }
                    for s in t.get("spans", [])
                    if isinstance(s, dict)
                ],
                "metrics": t.get("metrics", {}),
                "feedback": t.get("feedback", []),
            })

        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "total": len(buffer),
            "returned": len(safe_traces),
            "traces": safe_traces,
        }
    except Exception as e:
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "total": 0,
            "returned": 0,
            "traces": [],
        }


@router.get("/agent-performance")
async def get_agent_performance():
    """
    GET /metrics/agent-performance
    
    Get per-agent performance breakdown from Opik trace buffer.
    Groups traces by agent name and computes metrics per agent.
    """
    try:
        buffer = get_metrics_buffer()
        
        agents = {}
        for trace in buffer:
            name = trace.get("name", "unknown")
            # Extract agent prefix (e.g., "Supervisor" from "Supervisor_Run")
            agent_key = name.split("_")[0] if "_" in name else name
            
            if agent_key not in agents:
                agents[agent_key] = {
                    "agent": agent_key,
                    "total_calls": 0,
                    "success": 0,
                    "errors": 0,
                    "total_duration": 0,
                    "durations": [],
                    "metrics": {},
                    "feedback_scores": [],
                }
            
            a = agents[agent_key]
            a["total_calls"] += 1
            if trace.get("status") == "success":
                a["success"] += 1
            else:
                a["errors"] += 1
            
            dur = trace.get("duration", 0)
            a["total_duration"] += dur
            a["durations"].append(dur)
            
            # Collect metrics
            for mk, mv in trace.get("metrics", {}).items():
                if mk not in a["metrics"]:
                    a["metrics"][mk] = []
                a["metrics"][mk].append(mv)
            
            # Collect feedback scores
            for fb in trace.get("feedback", []):
                a["feedback_scores"].append(fb.get("score", 0))
        
        # Compute summaries
        result = []
        for key, a in agents.items():
            avg_duration = a["total_duration"] / a["total_calls"] if a["total_calls"] else 0
            p95_idx = int(len(a["durations"]) * 0.95) if a["durations"] else 0
            sorted_durs = sorted(a["durations"])
            p95 = sorted_durs[min(p95_idx, len(sorted_durs) - 1)] if sorted_durs else 0
            
            avg_metrics = {
                mk: sum(mv) / len(mv) if mv else 0
                for mk, mv in a["metrics"].items()
            }
            
            avg_feedback = sum(a["feedback_scores"]) / len(a["feedback_scores"]) if a["feedback_scores"] else 0
            
            result.append({
                "agent": key,
                "total_calls": a["total_calls"],
                "success_rate": (a["success"] / a["total_calls"] * 100) if a["total_calls"] else 0,
                "errors": a["errors"],
                "avg_duration_ms": round(avg_duration * 1000, 1),
                "p95_duration_ms": round(p95 * 1000, 1),
                "avg_feedback": round(avg_feedback, 3),
                "avg_metrics": avg_metrics,
            })
        
        result.sort(key=lambda x: x["total_calls"], reverse=True)
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "agents": result,
            "total_agents": len(result),
        }
    except Exception as e:
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "agents": [],
            "total_agents": 0,
        }


@router.get("/timeline")
async def get_metrics_timeline(hours: int = 24):
    """
    GET /metrics/timeline
    
    Get time-series trace data for charting.
    Groups traces into time buckets for line/area charts.
    """
    try:
        buffer = get_metrics_buffer()
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=hours)
        
        # Determine bucket size
        if hours <= 1:
            bucket_minutes = 5
        elif hours <= 6:
            bucket_minutes = 15
        elif hours <= 24:
            bucket_minutes = 60
        else:
            bucket_minutes = 360
        
        # Align cutoff to bucket boundary so trace bucketing matches
        cutoff = cutoff.replace(
            minute=(cutoff.minute // bucket_minutes) * bucket_minutes,
            second=0, microsecond=0
        )
        
        # Build ordered bucket list
        buckets = {}
        bucket_keys_ordered = []
        bucket_count = max(1, hours * 60 // bucket_minutes)
        
        for i in range(bucket_count):
            bucket_time = cutoff + timedelta(minutes=i * bucket_minutes)
            key = bucket_time.strftime("%H:%M")
            if key not in buckets:
                buckets[key] = {
                    "time": key,
                    "traces": 0,
                    "success": 0,
                    "errors": 0,
                    "avg_duration": 0,
                    "_durations": [],
                }
                bucket_keys_ordered.append(key)
        
        cutoff_ts = cutoff.timestamp()
        
        for trace in buffer:
            # Get end_time as a Unix timestamp
            end_time = trace.get("end_time")
            if not end_time:
                continue
            
            # Convert to float timestamp
            if isinstance(end_time, (int, float)):
                ts = float(end_time)
            elif isinstance(end_time, str):
                try:
                    ts = datetime.fromisoformat(end_time.replace("Z", "+00:00")).timestamp()
                except Exception:
                    continue
            else:
                continue
            
            # Skip if outside window
            if ts < cutoff_ts:
                continue
            
            # Convert to datetime for bucket matching
            t = datetime.utcfromtimestamp(ts)
            bucket_time = t.replace(
                minute=(t.minute // bucket_minutes) * bucket_minutes,
                second=0, microsecond=0
            )
            key = bucket_time.strftime("%H:%M")
            
            if key in buckets:
                b = buckets[key]
                b["traces"] += 1
                if trace.get("status") == "success":
                    b["success"] += 1
                else:
                    b["errors"] += 1
                b["_durations"].append(trace.get("duration", 0))
        
        # Compute avg durations and build ordered timeline
        timeline = []
        for key in bucket_keys_ordered:
            b = buckets[key]
            if b["_durations"]:
                b["avg_duration"] = round(sum(b["_durations"]) / len(b["_durations"]) * 1000, 1)
            del b["_durations"]
            timeline.append(b)
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "hours": hours,
            "bucket_minutes": bucket_minutes,
            "data": timeline,
        }
    except Exception as e:
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "hours": hours,
            "data": [],
        }


@router.get("/health")
async def metrics_health():
    """
    GET /metrics/health
    
    Health check for metrics/database connectivity.
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("users").select("id").limit(1).execute()
        
        opik_stats = get_dashboard_stats()
        
        return {
            "status": "healthy",
            "database": "connected",
            "opik_traces": opik_stats.get("total_traces", 0),
            "opik_active": len(get_all_active_traces()),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
