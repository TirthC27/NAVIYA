"""dataset.py - Dataset creation and metric functions for Opik."""

import opik
from src.config import settings


def get_client() -> opik.Opik:
    """Create and return an Opik client with workspace/project config."""
    kwargs = {}
    if settings.OPIK_WORKSPACE:
        kwargs["workspace"] = settings.OPIK_WORKSPACE
    if settings.OPIK_PROJECT:
        kwargs["project_name"] = settings.OPIK_PROJECT
    return opik.Opik(**kwargs)


def create_dataset(client=None):
    """Create (or retrieve) the evaluation dataset with sample items."""
    if client is None:
        client = get_client()

    dataset = client.get_or_create_dataset(name="llm_evaluation_dataset")

    dataset.insert([
        {
            "query": "What is Opik?",
            "expected": "observability platform",
        },
        {
            "query": "How does trace logging work in Opik?",
            "expected": "records inputs outputs and latency",
        },
        {
            "query": "What metrics does Opik support?",
            "expected": "scoring functions",
        },
        {
            "query": "How do you optimize prompts with Opik?",
            "expected": "MetaPromptOptimizer",
        },
    ])

    return dataset


# ---------------------------------------------------------------------------
# Metric functions (Opik v3 requires plain callables, NOT class-based)
# Signature: (dataset_item: dict, llm_output: str, task_span=None) -> float
# ---------------------------------------------------------------------------


def containment_metric(dataset_item, llm_output, task_span=None) -> float:
    """Return 1.0 if the expected text appears in the LLM output, else 0.0."""
    expected = dataset_item.get("expected", "").lower()
    output = (llm_output or "").lower()
    return 1.0 if expected in output else 0.0


def word_overlap_metric(dataset_item, llm_output, task_span=None) -> float:
    """Return the fraction of expected words found in the LLM output."""
    expected_words = set(dataset_item.get("expected", "").lower().split())
    if not expected_words:
        return 1.0
    output_words = set((llm_output or "").lower().split())
    overlap = expected_words & output_words
    return len(overlap) / len(expected_words)
