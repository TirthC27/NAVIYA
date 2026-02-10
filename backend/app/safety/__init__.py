"""
Naviya AI - Safety Module
PII detection and content safety guardrails
"""

from .pii_guard import (
    SafetyGuard,
    SafetyCheckResult,
    check_content_safety,
    detect_pii,
    detect_unsafe_queries,
    is_safe_topic,
    get_safety_metrics
)

__all__ = [
    "SafetyGuard",
    "SafetyCheckResult",
    "check_content_safety",
    "detect_pii",
    "detect_unsafe_queries",
    "is_safe_topic",
    "get_safety_metrics"
]
