"""
Naviya AI - OPIK Client for Observability
Provides tracing, metrics, and feedback logging capabilities

Features:
- Initialize OPIK with project configuration
- Start/end traces for pipeline runs
- Log metrics (latency, quality scores)
- Log feedback (human/LLM-as-judge evaluations)
- Create spans for individual pipeline nodes
"""

import os
import time
import uuid
import functools
import asyncio
from typing import Optional, Dict, Any, Callable, List
from datetime import datetime
from contextlib import contextmanager, asynccontextmanager
from dataclasses import dataclass, field

try:
    import opik
    from opik import Opik, track
    from opik.api_objects.trace import Trace
    from opik.api_objects.span import Span
    OPIK_AVAILABLE = True
except ImportError:
    OPIK_AVAILABLE = False
    print("[WARN] OPIK not installed. Running without observability.")


# ============================================
# Configuration
# ============================================
@dataclass
class OpikConfig:
    """Configuration for OPIK client"""
    project_name: str = "Naviya"
    api_key: str = field(default_factory=lambda: os.getenv("OPIK_API_KEY", ""))
    workspace: str = field(default_factory=lambda: os.getenv("OPIK_WORKSPACE", "tirthc27"))
    enabled: bool = True
    log_to_console: bool = True


# Global state
_opik_client: Optional[Any] = None
_config: Optional[OpikConfig] = None
_active_traces: Dict[str, Any] = {}
_active_spans: Dict[str, Any] = {}
_metrics_buffer: List[Dict] = []


# ============================================
# Core OPIK Client Functions
# ============================================
def init_opik(
    project_name: str = "Naviya",
    api_key: Optional[str] = None,
    workspace: Optional[str] = None
) -> bool:
    """
    Initialize OPIK client for the project.
    
    Args:
        project_name: Name of the project in OPIK dashboard
        api_key: OPIK API key (defaults to env var)
        workspace: OPIK workspace name
        
    Returns:
        bool: True if initialization successful
    """
    global _opik_client, _config
    
    _config = OpikConfig(
        project_name=project_name,
        api_key=api_key or os.getenv("OPIK_API_KEY", "ARtXGDhLbJmFIP4VaT0XT14n5"),
        workspace=workspace or os.getenv("OPIK_WORKSPACE", "tirthc27")
    )
    
    if not OPIK_AVAILABLE:
        print(f"[OPIK] Not available - running in mock mode for {project_name}")
        return False
    
    try:
        # Configure OPIK
        opik.configure(
            api_key=_config.api_key,
            workspace=_config.workspace,
            use_local=False
        )
        
        _opik_client = Opik(project_name=project_name)
        
        print(f"[OPIK] Initialized for project: {project_name}")
        print(f"   Workspace: {_config.workspace}")
        return True
        
    except Exception as e:
        print(f"[WARN] OPIK initialization failed: {e}")
        print("   Running in mock mode - metrics will be logged locally")
        return False


def get_opik_client() -> Optional[Any]:
    """Get the initialized OPIK client"""
    return _opik_client


def is_opik_enabled() -> bool:
    """Check if OPIK is properly initialized and enabled"""
    return _opik_client is not None and _config is not None and _config.enabled


# ============================================
# Trace Management
# ============================================
def start_trace(
    run_name: str,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None
) -> str:
    """
    Start a new trace for a pipeline run.
    
    Args:
        run_name: Name identifying the trace (e.g., "GenerateLearningPlan")
        metadata: Additional metadata to attach
        tags: Tags for filtering in dashboard
        
    Returns:
        str: Trace ID for reference
    """
    trace_id = str(uuid.uuid4())
    
    trace_data = {
        "id": trace_id,
        "name": run_name,
        "start_time": time.time(),
        "start_datetime": datetime.utcnow().isoformat(),
        "metadata": metadata or {},
        "tags": tags or [],
        "spans": [],
        "metrics": {},
        "feedback": []
    }
    
    _active_traces[trace_id] = trace_data
    
    if _config and _config.log_to_console:
        print(f"[TRACE] Started: {run_name} [{trace_id[:8]}...]")
    
    # If OPIK is available, create actual trace
    if is_opik_enabled():
        try:
            trace = _opik_client.trace(
                name=run_name,
                metadata=metadata,
                tags=tags
            )
            trace_data["opik_trace"] = trace
        except Exception as e:
            print(f"[WARN] Failed to create OPIK trace: {e}")
    
    return trace_id


def end_trace(
    trace_id: str,
    output: Optional[Dict[str, Any]] = None,
    status: str = "success"
) -> Dict[str, Any]:
    """
    End a trace and record final metrics.
    
    Args:
        trace_id: The trace ID to end
        output: Final output/result of the trace
        status: Status of the trace (success, error, partial)
        
    Returns:
        Dict containing trace summary
    """
    if trace_id not in _active_traces:
        return {"error": "Trace not found"}
    
    trace_data = _active_traces[trace_id]
    trace_data["end_time"] = time.time()
    trace_data["duration"] = trace_data["end_time"] - trace_data["start_time"]
    trace_data["status"] = status
    trace_data["output"] = output
    
    if _config and _config.log_to_console:
        print(f"[TRACE] Ended: {trace_data['name']} [{trace_id[:8]}...]")
        print(f"   Duration: {trace_data['duration']:.2f}s | Status: {status}")
        print(f"   Spans: {len(trace_data['spans'])} | Metrics: {len(trace_data['metrics'])}")
    
    # End OPIK trace if available
    if is_opik_enabled() and "opik_trace" in trace_data:
        try:
            trace_data["opik_trace"].end(
                output=output,
                metadata={"status": status, "duration_seconds": trace_data["duration"]}
            )
        except Exception as e:
            print(f"[WARN] Failed to end OPIK trace: {e}")
    
    # Store to buffer for batch processing (strip non-serializable SDK objects)
    safe_copy = {}
    for k, v in trace_data.items():
        if k == "opik_trace":
            continue  # skip SDK object (_thread.RLock, etc.)
        if k == "spans":
            # Strip any opik_span objects from span data
            safe_spans = []
            for sp in v:
                safe_span = {sk: sv for sk, sv in sp.items() if sk != "opik_span"} if isinstance(sp, dict) else sp
                safe_spans.append(safe_span)
            safe_copy[k] = safe_spans
        else:
            safe_copy[k] = v
    _metrics_buffer.append(safe_copy)
    
    # Remove from active traces
    del _active_traces[trace_id]
    
    return {
        "trace_id": trace_id,
        "name": trace_data["name"],
        "duration": trace_data["duration"],
        "status": status,
        "spans_count": len(trace_data["spans"]),
        "metrics": trace_data["metrics"]
    }


# ============================================
# Span Management (for individual nodes)
# ============================================
@contextmanager
def create_span(
    trace_id: str,
    span_name: str,
    span_type: str = "general",
    input_data: Optional[Dict[str, Any]] = None
):
    """
    Create a span within a trace for timing individual operations.
    
    Args:
        trace_id: Parent trace ID
        span_name: Name of the span (e.g., "RoadmapNode")
        span_type: Type of operation (llm, tool, processing)
        input_data: Input to this span
        
    Yields:
        Span context that can be used to log additional data
    """
    span_id = str(uuid.uuid4())
    start_time = time.time()
    
    span_data = {
        "id": span_id,
        "trace_id": trace_id,
        "name": span_name,
        "type": span_type,
        "start_time": start_time,
        "input": input_data,
        "output": None,
        "error": None,
        "metrics": {}
    }
    
    _active_spans[span_id] = span_data
    
    # Create OPIK span if available
    opik_span = None
    if is_opik_enabled() and trace_id in _active_traces:
        trace_data = _active_traces[trace_id]
        if "opik_trace" in trace_data:
            try:
                opik_span = trace_data["opik_trace"].span(
                    name=span_name,
                    type=span_type,
                    input=input_data
                )
            except Exception as e:
                print(f"[WARN] Failed to create OPIK span: {e}")
    
    class SpanContext:
        def __init__(self):
            self.span_id = span_id
            
        def set_output(self, output: Any):
            span_data["output"] = output
            
        def set_error(self, error: str):
            span_data["error"] = error
            
        def log_metric(self, name: str, value: float):
            span_data["metrics"][name] = value
    
    context = SpanContext()
    
    try:
        yield context
    except Exception as e:
        span_data["error"] = str(e)
        raise
    finally:
        end_time = time.time()
        span_data["end_time"] = end_time
        span_data["duration"] = end_time - start_time
        
        if _config and _config.log_to_console:
            # Show status indicator for error vs success
            has_error = span_data.get("error") is not None
            status = "[ERR]" if has_error else "[OK]"
            print(f"   {status} Span: {span_name} ({span_data['duration']:.3f}s)")
        
        # End OPIK span
        if opik_span:
            try:
                opik_span.end(
                    output=span_data["output"],
                    metadata={
                        "duration_seconds": span_data["duration"],
                        "error": span_data["error"]
                    }
                )
            except Exception:
                pass
        
        # Add to trace
        if trace_id and trace_id in _active_traces:
            _active_traces[trace_id]["spans"].append(span_data)
        
        if span_id in _active_spans:
            del _active_spans[span_id]


@asynccontextmanager
async def create_span_async(
    trace_id: str,
    span_name: str,
    span_type: str = "general",
    input_data: Optional[Dict[str, Any]] = None
):
    """Async version of create_span"""
    span_id = str(uuid.uuid4())
    start_time = time.time()
    
    span_data = {
        "id": span_id,
        "trace_id": trace_id,
        "name": span_name,
        "type": span_type,
        "start_time": start_time,
        "input": input_data,
        "output": None,
        "error": None,
        "metrics": {}
    }
    
    _active_spans[span_id] = span_data
    
    opik_span = None
    if is_opik_enabled() and trace_id in _active_traces:
        trace_data = _active_traces[trace_id]
        if "opik_trace" in trace_data:
            try:
                opik_span = trace_data["opik_trace"].span(
                    name=span_name,
                    type=span_type,
                    input=input_data
                )
            except Exception as e:
                print(f"[WARN] Failed to create OPIK span: {e}")
    
    class SpanContext:
        def __init__(self):
            self.span_id = span_id
            
        def set_output(self, output: Any):
            span_data["output"] = output
            
        def set_error(self, error: str):
            span_data["error"] = error
            
        def log_metric(self, name: str, value: float):
            span_data["metrics"][name] = value
    
    context = SpanContext()
    
    try:
        yield context
    except Exception as e:
        span_data["error"] = str(e)
        raise
    finally:
        end_time = time.time()
        span_data["end_time"] = end_time
        span_data["duration"] = end_time - start_time
        
        if _config and _config.log_to_console:
            # Show status indicator for error vs success
            has_error = span_data.get("error") is not None
            status = "[ERR]" if has_error else "[OK]"
            print(f"   {status} Span: {span_name} ({span_data['duration']:.3f}s)")
        
        if opik_span:
            try:
                opik_span.end(
                    output=span_data["output"],
                    metadata={
                        "duration_seconds": span_data["duration"],
                        "error": span_data["error"]
                    }
                )
            except Exception:
                pass
        
        if trace_id and trace_id in _active_traces:
            _active_traces[trace_id]["spans"].append(span_data)
        
        if span_id in _active_spans:
            del _active_spans[span_id]


# ============================================
# Metrics Logging
# ============================================
def log_metric(
    trace_id: str,
    name: str,
    value: float,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log a metric value for a trace.
    
    Args:
        trace_id: The trace to log to
        name: Metric name (e.g., "latency_ms", "quality_score")
        value: Numeric metric value
        metadata: Additional context
    """
    if trace_id not in _active_traces:
        print(f"[WARN] Cannot log metric - trace {trace_id} not found")
        return
    
    metric_entry = {
        "name": name,
        "value": value,
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": metadata or {}
    }
    
    _active_traces[trace_id]["metrics"][name] = metric_entry
    
    if _config and _config.log_to_console:
        print(f"   [METRIC] {name} = {value}")
    
    # Log to OPIK if available
    if is_opik_enabled() and "opik_trace" in _active_traces[trace_id]:
        try:
            _opik_client.log_metric(
                trace_id=trace_id,
                name=name,
                value=value
            )
        except Exception:
            pass


# ============================================
# Feedback Logging (for evaluations)
# ============================================
def log_feedback(
    trace_id: str,
    label: str,
    score: float,
    reason: Optional[str] = None,
    evaluator: str = "system"
):
    """
    Log feedback/evaluation for a trace.
    
    Args:
        trace_id: The trace to log feedback for
        label: Feedback category (e.g., "relevance", "quality")
        score: Score value (typically 0-10 or 0-1)
        reason: Explanation for the score
        evaluator: Who provided the feedback (human, llm-judge, system)
    """
    if trace_id not in _active_traces:
        print(f"[WARN] Cannot log feedback - trace {trace_id} not found")
        return
    
    feedback_entry = {
        "label": label,
        "score": score,
        "reason": reason,
        "evaluator": evaluator,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    _active_traces[trace_id]["feedback"].append(feedback_entry)
    
    if _config and _config.log_to_console:
        print(f"   [FEEDBACK] {label} = {score}/10 ({evaluator})")
    
    # Log to OPIK if available
    if is_opik_enabled() and "opik_trace" in _active_traces[trace_id]:
        try:
            _opik_client.log_feedback(
                trace_id=trace_id,
                name=label,
                value=score,
                reason=reason
            )
        except Exception:
            pass


# ============================================
# Decorator for Automatic Tracing
# ============================================
def traced(
    name: Optional[str] = None,
    capture_input: bool = True,
    capture_output: bool = True
):
    """
    Decorator to automatically trace function execution.
    
    Args:
        name: Custom name for the trace (defaults to function name)
        capture_input: Whether to capture function inputs
        capture_output: Whether to capture function outputs
    """
    def decorator(func: Callable):
        trace_name = name or func.__name__
        
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                input_data = {"args": str(args), "kwargs": str(kwargs)} if capture_input else None
                trace_id = start_trace(trace_name, metadata=input_data)
                
                try:
                    result = await func(*args, **kwargs)
                    output_data = {"result": str(result)[:500]} if capture_output else None
                    end_trace(trace_id, output=output_data, status="success")
                    return result
                except Exception as e:
                    end_trace(trace_id, output={"error": str(e)}, status="error")
                    raise
            
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                input_data = {"args": str(args), "kwargs": str(kwargs)} if capture_input else None
                trace_id = start_trace(trace_name, metadata=input_data)
                
                try:
                    result = func(*args, **kwargs)
                    output_data = {"result": str(result)[:500]} if capture_output else None
                    end_trace(trace_id, output=output_data, status="success")
                    return result
                except Exception as e:
                    end_trace(trace_id, output={"error": str(e)}, status="error")
                    raise
            
            return sync_wrapper
    
    return decorator


# ============================================
# OpikTracer Class for Context Management
# ============================================
class OpikTracer:
    """
    Context manager class for tracing pipeline execution.
    
    Usage:
        async with OpikTracer("GenerateLearningPlan", topic="python") as tracer:
            async with tracer.span("RoadmapNode") as span:
                result = await generate_roadmap()
                span.set_output(result)
            tracer.log_metric("quality_score", 8.5)
    """
    
    def __init__(
        self,
        name: str,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        **extra_metadata
    ):
        self.name = name
        self.metadata = {**(metadata or {}), **extra_metadata}
        self.tags = tags or []
        self.trace_id: Optional[str] = None
        
    def __enter__(self):
        self.trace_id = start_trace(self.name, self.metadata, self.tags)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        status = "error" if exc_type else "success"
        output = {"error": str(exc_val)} if exc_val else None
        end_trace(self.trace_id, output=output, status=status)
        return False
    
    async def __aenter__(self):
        self.trace_id = start_trace(self.name, self.metadata, self.tags)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        status = "error" if exc_type else "success"
        output = {"error": str(exc_val)} if exc_val else None
        end_trace(self.trace_id, output=output, status=status)
        return False
    
    def span(self, name: str, span_type: str = "general", input_data: Optional[Dict] = None):
        """Create a span within this trace"""
        return create_span(self.trace_id, name, span_type, input_data)
    
    def span_async(self, name: str, span_type: str = "general", input_data: Optional[Dict] = None):
        """Create an async span within this trace"""
        return create_span_async(self.trace_id, name, span_type, input_data)
    
    def log_metric(self, name: str, value: float, metadata: Optional[Dict] = None):
        """Log a metric to this trace"""
        log_metric(self.trace_id, name, value, metadata)
    
    def log_feedback(self, label: str, score: float, reason: Optional[str] = None, evaluator: str = "system"):
        """Log feedback to this trace"""
        log_feedback(self.trace_id, label, score, reason, evaluator)


# ============================================
# Utility Functions
# ============================================
def get_trace_summary(trace_id: str) -> Optional[Dict]:
    """Get summary of an active trace"""
    if trace_id in _active_traces:
        trace = _active_traces[trace_id]
        return {
            "id": trace_id,
            "name": trace["name"],
            "elapsed": time.time() - trace["start_time"],
            "spans": len(trace["spans"]),
            "metrics": list(trace["metrics"].keys())
        }
    return None


def get_all_active_traces() -> List[Dict]:
    """Get list of all active traces"""
    return [get_trace_summary(tid) for tid in _active_traces.keys()]


def get_metrics_buffer() -> List[Dict]:
    """Get all completed traces from buffer"""
    return _metrics_buffer.copy()


def clear_metrics_buffer():
    """Clear the metrics buffer"""
    global _metrics_buffer
    _metrics_buffer = []


def get_dashboard_stats() -> Dict[str, Any]:
    """Get aggregated stats for dashboard display"""
    if not _metrics_buffer:
        return {"message": "No traces recorded yet"}
    
    total_traces = len(_metrics_buffer)
    success_count = sum(1 for t in _metrics_buffer if t.get("status") == "success")
    error_count = sum(1 for t in _metrics_buffer if t.get("status") == "error")
    
    durations = [t.get("duration", 0) for t in _metrics_buffer]
    avg_duration = sum(durations) / len(durations) if durations else 0
    
    all_feedback = []
    for trace in _metrics_buffer:
        all_feedback.extend(trace.get("feedback", []))
    
    feedback_by_label = {}
    for fb in all_feedback:
        label = fb["label"]
        if label not in feedback_by_label:
            feedback_by_label[label] = []
        feedback_by_label[label].append(fb["score"])
    
    avg_scores = {
        label: sum(scores) / len(scores)
        for label, scores in feedback_by_label.items()
    }
    
    return {
        "total_traces": total_traces,
        "success_rate": success_count / total_traces if total_traces else 0,
        "error_count": error_count,
        "avg_duration_seconds": avg_duration,
        "avg_scores": avg_scores,
        "active_traces": len(_active_traces)
    }

