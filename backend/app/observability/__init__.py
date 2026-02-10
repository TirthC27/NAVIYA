"""
Naviya AI - Observability Module
OPIK integration for tracing, metrics, and evaluation
"""

from .opik_client import (
    init_opik,
    get_opik_client,
    start_trace,
    end_trace,
    log_metric,
    log_feedback,
    create_span,
    OpikTracer,
    traced
)

__all__ = [
    "init_opik",
    "get_opik_client", 
    "start_trace",
    "end_trace",
    "log_metric",
    "log_feedback",
    "create_span",
    "OpikTracer",
    "traced"
]
