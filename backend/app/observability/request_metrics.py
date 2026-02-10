"""
Per-request Opik metrics storage using contextvars.

This module provides a request-scoped store so that call_gemini() can record
Opik trace metrics, and the FastAPI middleware can read them to attach
X-Opik-* response headers.  The frontend axios interceptor then reads
these headers and renders a beautiful Opik Metrics Toast popup.
"""

import contextvars
from typing import Optional, Dict, Any

# Contextvar that holds the metrics dict for the current request/task.
_opik_request_metrics: contextvars.ContextVar[Optional[Dict[str, Any]]] = (
    contextvars.ContextVar("opik_request_metrics", default=None)
)


def store_opik_metrics(
    agent_name: str,
    latency_ms: float,
    model: str,
    status: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    trace_id: str = "",
    **extra,
) -> None:
    """Store Opik metrics for the current request context."""
    _opik_request_metrics.set({
        "agent": agent_name,
        "latency_ms": round(latency_ms, 1),
        "model": model,
        "status": status,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "trace_id": trace_id,
        **extra,
    })


def get_opik_metrics() -> Optional[Dict[str, Any]]:
    """Get the Opik metrics stored for the current request context."""
    return _opik_request_metrics.get()


def clear_opik_metrics() -> None:
    """Clear after reading (so middleware doesn't re-send stale data)."""
    _opik_request_metrics.set(None)
