"""
Naviya AI - Opik Cloud API Proxy
Fetches real trace data from Opik Cloud for the observability dashboard.

Endpoints:
  GET /api/opik/traces       - Get traces from Opik Cloud
  GET /api/opik/stats        - Get aggregated stats from Opik Cloud
  GET /api/opik/projects     - Get projects from Opik Cloud
  GET /api/opik/dashboard    - Get combined dashboard data
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.observability.opik_client import (
    get_dashboard_stats,
    get_metrics_buffer,
    get_all_active_traces,
)

router = APIRouter(prefix="/api/opik", tags=["Opik Cloud Observability"])

# Opik Cloud API base URL
OPIK_API_BASE = "https://www.comet.com/opik/api/v1/private"


def _opik_headers() -> dict:
    """Build authentication headers for Opik Cloud API."""
    return {
        "Comet-API-Key": settings.OPIK_API_KEY,
        "Content-Type": "application/json",
    }


# ============================================
# Opik Cloud Proxy Endpoints
# ============================================

@router.get("/traces")
async def get_opik_cloud_traces(
    page: int = 1,
    size: int = 50,
    project_name: Optional[str] = None,
):
    """
    GET /api/opik/traces
    Fetch traces from Opik Cloud API with full details.
    """
    project = project_name or settings.OPIK_PROJECT or "Naviya"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            params = {
                "page": page,
                "size": size,
                "project_name": project,
                "truncate": "true",
            }
            resp = await client.get(
                f"{OPIK_API_BASE}/traces",
                headers=_opik_headers(),
                params=params,
            )

            if resp.status_code == 200:
                data = resp.json()
                traces = data.get("content", [])

                # Process traces for frontend consumption
                processed = []
                for t in traces:
                    duration = t.get("duration")
                    if duration is not None:
                        duration_ms = round(duration * 1000, 1) if duration < 100 else round(duration, 1)
                    else:
                        duration_ms = 0

                    processed.append({
                        "id": t.get("id", ""),
                        "name": t.get("name", "unknown"),
                        "start_time": t.get("start_time", ""),
                        "end_time": t.get("end_time", ""),
                        "duration_ms": duration_ms,
                        "status": "error" if t.get("error_info") else "success",
                        "input": t.get("input"),
                        "output": t.get("output"),
                        "metadata": t.get("metadata", {}),
                        "tags": t.get("tags", []),
                        "usage": t.get("usage", {}),
                        "total_estimated_cost": t.get("total_estimated_cost"),
                        "span_count": t.get("span_count", 0),
                        "llm_span_count": t.get("llm_span_count", 0),
                        "feedback_scores": t.get("feedback_scores", []),
                        "providers": t.get("providers", []),
                        "error_info": t.get("error_info"),
                    })

                return {
                    "success": True,
                    "source": "opik_cloud",
                    "timestamp": datetime.utcnow().isoformat(),
                    "page": data.get("page", page),
                    "size": data.get("size", size),
                    "total": data.get("total", 0),
                    "traces": processed,
                }

            # Fall back to in-memory buffer if cloud API fails
            print(f"[Opik Cloud] Traces API returned {resp.status_code}, falling back to buffer")

    except Exception as e:
        print(f"[Opik Cloud] Traces fetch error: {e}, falling back to buffer")

    # Fallback: return in-memory buffer traces
    buffer = get_metrics_buffer()
    traces = list(reversed(buffer[-size:]))
    return {
        "success": True,
        "source": "local_buffer",
        "timestamp": datetime.utcnow().isoformat(),
        "page": 1,
        "size": len(traces),
        "total": len(buffer),
        "traces": [
            {
                "id": t.get("id", ""),
                "name": t.get("name", "unknown"),
                "start_time": t.get("start_datetime", ""),
                "end_time": "",
                "duration_ms": round(t.get("duration", 0) * 1000, 1),
                "status": t.get("status", "unknown"),
                "input": t.get("metadata"),
                "output": t.get("output"),
                "metadata": t.get("metadata", {}),
                "tags": t.get("tags", []),
                "usage": {},
                "total_estimated_cost": None,
                "span_count": len(t.get("spans", [])),
                "llm_span_count": 0,
                "feedback_scores": t.get("feedback", []),
                "providers": [],
                "error_info": None,
            }
            for t in traces
        ],
    }


@router.get("/stats")
async def get_opik_cloud_stats(
    project_name: Optional[str] = None,
):
    """
    GET /api/opik/stats
    Aggregated stats combining Opik Cloud + local buffer data.
    """
    project = project_name or settings.OPIK_PROJECT or "Naviya"
    cloud_traces = []
    cloud_total = 0

    # Try Opik Cloud first
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{OPIK_API_BASE}/traces",
                headers=_opik_headers(),
                params={
                    "page": 1,
                    "size": 100,
                    "project_name": project,
                    "truncate": "true",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                cloud_traces = data.get("content", [])
                cloud_total = data.get("total", 0)
    except Exception as e:
        print(f"[Opik Cloud] Stats fetch error: {e}")

    # Local buffer stats
    local_stats = get_dashboard_stats()
    active_traces = get_all_active_traces()

    # Compute cloud stats
    if cloud_traces:
        error_count = sum(1 for t in cloud_traces if t.get("error_info"))
        success_count = cloud_total - error_count
        durations = [t.get("duration", 0) for t in cloud_traces if t.get("duration")]
        avg_duration = sum(durations) / len(durations) if durations else 0
        total_cost = sum(t.get("total_estimated_cost", 0) or 0 for t in cloud_traces)

        # Agent breakdown from cloud traces
        agent_counts = {}
        for t in cloud_traces:
            name = t.get("name", "unknown")
            agent_key = name.split("_")[0] if "_" in name else name
            if agent_key not in agent_counts:
                agent_counts[agent_key] = {"total": 0, "errors": 0, "durations": []}
            agent_counts[agent_key]["total"] += 1
            if t.get("error_info"):
                agent_counts[agent_key]["errors"] += 1
            if t.get("duration"):
                agent_counts[agent_key]["durations"].append(t["duration"])

        agents = []
        for key, a in agent_counts.items():
            avg_d = sum(a["durations"]) / len(a["durations"]) if a["durations"] else 0
            agents.append({
                "agent": key,
                "total_calls": a["total"],
                "success_rate": round(((a["total"] - a["errors"]) / a["total"] * 100) if a["total"] else 0, 1),
                "errors": a["errors"],
                "avg_duration_ms": round(avg_d * 1000, 1),
            })
        agents.sort(key=lambda x: x["total_calls"], reverse=True)

        return {
            "success": True,
            "source": "opik_cloud",
            "timestamp": datetime.utcnow().isoformat(),
            "stats": {
                "total_traces": cloud_total,
                "success_rate": success_count / cloud_total if cloud_total else 1.0,
                "error_count": error_count,
                "avg_duration_seconds": avg_duration,
                "active_traces": len(active_traces),
                "total_estimated_cost": round(total_cost, 6),
            },
            "agents": agents,
            "active_traces": active_traces,
            "active_count": len(active_traces),
            "opik_workspace": settings.OPIK_WORKSPACE,
            "opik_project": project,
            "opik_dashboard_url": f"https://www.comet.com/opik/{settings.OPIK_WORKSPACE}",
        }

    # Fallback to local stats
    return {
        "success": True,
        "source": "local_buffer",
        "timestamp": datetime.utcnow().isoformat(),
        "stats": local_stats,
        "agents": [],
        "active_traces": active_traces,
        "active_count": len(active_traces),
        "opik_workspace": settings.OPIK_WORKSPACE,
        "opik_project": project,
        "opik_dashboard_url": f"https://www.comet.com/opik/{settings.OPIK_WORKSPACE}",
    }


@router.get("/projects")
async def get_opik_projects():
    """
    GET /api/opik/projects
    List projects from Opik Cloud.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{OPIK_API_BASE}/projects",
                headers=_opik_headers(),
                params={"size": 50},
            )
            if resp.status_code == 200:
                data = resp.json()
                projects = data.get("content", [])
                return {
                    "success": True,
                    "source": "opik_cloud",
                    "projects": [
                        {
                            "id": p.get("id"),
                            "name": p.get("name"),
                            "created_at": p.get("created_at"),
                            "last_updated_at": p.get("last_updated_at"),
                        }
                        for p in projects
                    ],
                }
    except Exception as e:
        print(f"[Opik Cloud] Projects fetch error: {e}")

    return {
        "success": True,
        "source": "local",
        "projects": [{"id": None, "name": settings.OPIK_PROJECT}],
    }


@router.get("/dashboard")
async def get_opik_dashboard(
    project_name: Optional[str] = None,
):
    """
    GET /api/opik/dashboard
    Combined dashboard data: stats + recent traces + agent breakdown.
    Returns everything the frontend Opik dashboard needs in a single call.
    """
    project = project_name or settings.OPIK_PROJECT or "Naviya"

    cloud_data = None
    cloud_traces = []
    cloud_total = 0

    # Fetch from Opik Cloud
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                f"{OPIK_API_BASE}/traces",
                headers=_opik_headers(),
                params={
                    "page": 1,
                    "size": 100,
                    "project_name": project,
                    "truncate": "true",
                },
            )
            if resp.status_code == 200:
                cloud_data = resp.json()
                cloud_traces = cloud_data.get("content", [])
                cloud_total = cloud_data.get("total", 0)
    except Exception as e:
        print(f"[Opik Cloud] Dashboard fetch error: {e}")

    # Local buffer data
    local_stats = get_dashboard_stats()
    active = get_all_active_traces()
    buffer = get_metrics_buffer()

    # Use cloud data if available, otherwise local buffer
    source = "opik_cloud" if cloud_traces else "local_buffer"
    traces_to_process = cloud_traces if cloud_traces else buffer

    # Compute stats
    total = cloud_total if cloud_traces else len(buffer)
    errors = 0
    durations = []
    total_cost = 0.0
    agent_map: Dict[str, Dict] = {}
    timeline_buckets: Dict[str, Dict] = {}

    for t in traces_to_process:
        # Get name/status/duration depending on source
        if cloud_traces:
            name = t.get("name", "unknown")
            is_error = bool(t.get("error_info"))
            dur = t.get("duration", 0) or 0
            cost = t.get("total_estimated_cost", 0) or 0
            ts = t.get("start_time", "")
        else:
            name = t.get("name", "unknown")
            is_error = t.get("status") == "error"
            dur = t.get("duration", 0) or 0
            cost = 0
            ts = t.get("start_datetime", "")

        if is_error:
            errors += 1
        if dur:
            durations.append(dur)
        total_cost += cost

        # Agent breakdown
        agent_key = name.split("_")[0] if "_" in name else name
        if agent_key not in agent_map:
            agent_map[agent_key] = {"total": 0, "errors": 0, "durations": [], "costs": []}
        agent_map[agent_key]["total"] += 1
        if is_error:
            agent_map[agent_key]["errors"] += 1
        if dur:
            agent_map[agent_key]["durations"].append(dur)
        agent_map[agent_key]["costs"].append(cost)

        # Timeline (hourly buckets)
        if ts:
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00")) if isinstance(ts, str) else datetime.utcnow()
                bucket_key = dt.strftime("%H:00")
                if bucket_key not in timeline_buckets:
                    timeline_buckets[bucket_key] = {"time": bucket_key, "traces": 0, "success": 0, "errors": 0, "avg_duration": 0, "_durations": []}
                timeline_buckets[bucket_key]["traces"] += 1
                if is_error:
                    timeline_buckets[bucket_key]["errors"] += 1
                else:
                    timeline_buckets[bucket_key]["success"] += 1
                if dur:
                    timeline_buckets[bucket_key]["_durations"].append(dur)
            except Exception:
                pass

    avg_duration = sum(durations) / len(durations) if durations else 0

    # Build agent list
    agents = []
    for key, a in agent_map.items():
        avg_d = sum(a["durations"]) / len(a["durations"]) if a["durations"] else 0
        agents.append({
            "agent": key,
            "total_calls": a["total"],
            "success_rate": round(((a["total"] - a["errors"]) / a["total"] * 100) if a["total"] else 0, 1),
            "errors": a["errors"],
            "avg_duration_ms": round(avg_d * 1000, 1),
            "total_cost": round(sum(a["costs"]), 6),
        })
    agents.sort(key=lambda x: x["total_calls"], reverse=True)

    # Build timeline
    timeline = []
    for key in sorted(timeline_buckets.keys()):
        b = timeline_buckets[key]
        if b["_durations"]:
            b["avg_duration"] = round(sum(b["_durations"]) / len(b["_durations"]) * 1000, 1)
        del b["_durations"]
        timeline.append(b)

    # Build recent traces list
    recent_traces = []
    display_traces = cloud_traces[:20] if cloud_traces else list(reversed(buffer[-20:]))
    for t in display_traces:
        if cloud_traces:
            dur = t.get("duration", 0) or 0
            recent_traces.append({
                "id": t.get("id", ""),
                "name": t.get("name", "unknown"),
                "start_time": t.get("start_time", ""),
                "duration_ms": round(dur * 1000, 1) if dur < 100 else round(dur, 1),
                "status": "error" if t.get("error_info") else "success",
                "tags": t.get("tags", []),
                "span_count": t.get("span_count", 0),
                "total_estimated_cost": t.get("total_estimated_cost"),
                "usage": t.get("usage", {}),
                "providers": t.get("providers", []),
            })
        else:
            recent_traces.append({
                "id": t.get("id", ""),
                "name": t.get("name", "unknown"),
                "start_time": t.get("start_datetime", ""),
                "duration_ms": round(t.get("duration", 0) * 1000, 1),
                "status": t.get("status", "unknown"),
                "tags": t.get("tags", []),
                "span_count": len(t.get("spans", [])),
                "total_estimated_cost": None,
                "usage": {},
                "providers": [],
            })

    return {
        "success": True,
        "source": source,
        "timestamp": datetime.utcnow().isoformat(),
        "stats": {
            "total_traces": total,
            "success_rate": (total - errors) / total if total else 1.0,
            "error_count": errors,
            "avg_duration_seconds": avg_duration,
            "avg_duration_ms": round(avg_duration * 1000, 1),
            "active_traces": len(active),
            "total_estimated_cost": round(total_cost, 6),
        },
        "agents": agents,
        "recent_traces": recent_traces,
        "timeline": timeline,
        "active_traces": active,
        "opik_workspace": settings.OPIK_WORKSPACE,
        "opik_project": project,
        "opik_dashboard_url": f"https://www.comet.com/opik/{settings.OPIK_WORKSPACE}",
    }
