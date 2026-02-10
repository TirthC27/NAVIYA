"""
Naviya AI - Evaluations Module
LLM-as-judge evaluations for learning plan quality
"""

from .judges import (
    evaluate_learning_plan,
    evaluate_roadmap_relevance,
    evaluate_video_quality,
    evaluate_simplicity,
    evaluate_progressiveness,
    EvaluationResult,
    run_all_evaluations
)

from .regression_tests import (
    RegressionTestRunner,
    TestCase,
    TestResult,
    ExperimentResult,
    GOLDEN_DATASET,
    run_quick_regression,
    run_full_regression
)

__all__ = [
    # Judges
    "evaluate_learning_plan",
    "evaluate_roadmap_relevance",
    "evaluate_video_quality", 
    "evaluate_simplicity",
    "evaluate_progressiveness",
    "EvaluationResult",
    "run_all_evaluations",
    # Regression Tests
    "RegressionTestRunner",
    "TestCase",
    "TestResult",
    "ExperimentResult",
    "GOLDEN_DATASET",
    "run_quick_regression",
    "run_full_regression"
]
