"""monitoring.py - Quality gates and dashboard helpers."""

import opik
from src.config import settings


@opik.track(name="online_quality_gate")
def online_quality_gate(llm_output: str, expected: str = None) -> dict:
    """Run quality checks on an LLM output and return pass/fail result."""
    issues = []

    # Check 1: Empty response
    if not llm_output or not llm_output.strip():
        issues.append("empty_response")

    # Check 2: Too short
    if llm_output and len(llm_output.strip()) < 10:
        issues.append("too_short")

    # Check 3: Too long
    if llm_output and len(llm_output.strip()) > 5000:
        issues.append("too_long")

    # Check 4: Expected text missing
    if expected and expected.lower() not in (llm_output or "").lower():
        issues.append("expected_text_missing")

    passed = len(issues) == 0
    result = {"passed": passed, "issues": issues}

    status = "PASS" if passed else "FAIL"
    preview = (llm_output or "")[:60]
    print(f"  Quality gate [{status}]: \"{preview}...\"  issues={issues}")

    return result


def dashboard_info() -> None:
    """Print where to find traces and results in the Opik dashboard."""
    print("\n--- Opik Dashboard Info ---")
    print(f"  Workspace: {settings.OPIK_WORKSPACE}")
    print(f"  Project:   {settings.OPIK_PROJECT}")
    print("  URL:       https://www.comet.com/opik")
    print("  Go to the dashboard to view traces, datasets, and optimization results.")
