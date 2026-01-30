"""
LearnTube AI - Regression Test Suite
Automated testing for model/prompt changes with OPIK experiments

Features:
- Golden dataset management
- A/B testing support
- Prompt regression detection
- Experiment tracking
- Statistical significance analysis
"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
import statistics

from app.observability.opik_client import (
    start_trace,
    end_trace,
    log_metric,
    log_feedback,
    get_dashboard_stats
)
from app.evals.judges import evaluate_learning_plan, run_all_evaluations
from app.agents.learning_graph import generate_learning_plan


# ============================================
# Data Classes
# ============================================
@dataclass
class TestCase:
    """A single test case for regression testing"""
    id: str
    topic: str
    expected_difficulty: Optional[str] = None
    min_steps: int = 1
    max_steps: int = 6
    expected_keywords: List[str] = field(default_factory=list)
    min_quality_score: float = 5.0
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class TestResult:
    """Result of running a single test case"""
    test_id: str
    passed: bool
    actual_difficulty: Optional[str] = None
    actual_steps: int = 0
    quality_score: float = 0.0
    evaluation_scores: Dict[str, float] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    duration_ms: float = 0.0
    trace_id: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ExperimentResult:
    """Result of running a full experiment"""
    experiment_name: str
    experiment_id: str
    timestamp: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    pass_rate: float
    avg_quality_score: float
    avg_duration_ms: float
    results: List[TestResult] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "experiment_name": self.experiment_name,
            "experiment_id": self.experiment_id,
            "timestamp": self.timestamp,
            "total_tests": self.total_tests,
            "passed_tests": self.passed_tests,
            "failed_tests": self.failed_tests,
            "pass_rate": self.pass_rate,
            "avg_quality_score": self.avg_quality_score,
            "avg_duration_ms": self.avg_duration_ms,
            "results": [r.to_dict() for r in self.results],
            "metadata": self.metadata
        }


# ============================================
# Golden Dataset
# ============================================
GOLDEN_DATASET: List[TestCase] = [
    # Simple topics
    TestCase(
        id="simple_001",
        topic="what is HTML",
        expected_difficulty="simple",
        min_steps=1,
        max_steps=2,
        expected_keywords=["HTML", "tags", "web"],
        min_quality_score=6.0,
        tags=["simple", "web"]
    ),
    TestCase(
        id="simple_002",
        topic="basic for loops in Python",
        expected_difficulty="simple",
        min_steps=1,
        max_steps=2,
        expected_keywords=["loop", "for", "iterate"],
        min_quality_score=6.0,
        tags=["simple", "python"]
    ),
    TestCase(
        id="simple_003",
        topic="what is CSS",
        expected_difficulty="simple",
        min_steps=1,
        max_steps=2,
        expected_keywords=["CSS", "style", "design"],
        min_quality_score=6.0,
        tags=["simple", "web"]
    ),
    
    # Medium topics
    TestCase(
        id="medium_001",
        topic="React hooks tutorial",
        expected_difficulty="medium",
        min_steps=3,
        max_steps=4,
        expected_keywords=["useState", "useEffect", "hook"],
        min_quality_score=5.5,
        tags=["medium", "react", "javascript"]
    ),
    TestCase(
        id="medium_002",
        topic="SQL joins explained",
        expected_difficulty="medium",
        min_steps=3,
        max_steps=4,
        expected_keywords=["join", "inner", "outer", "SQL"],
        min_quality_score=5.5,
        tags=["medium", "database", "sql"]
    ),
    TestCase(
        id="medium_003",
        topic="REST API design",
        expected_difficulty="medium",
        min_steps=3,
        max_steps=4,
        expected_keywords=["REST", "API", "endpoint", "HTTP"],
        min_quality_score=5.5,
        tags=["medium", "backend", "api"]
    ),
    TestCase(
        id="medium_004",
        topic="Docker containers basics",
        expected_difficulty="medium",
        min_steps=3,
        max_steps=4,
        expected_keywords=["Docker", "container", "image"],
        min_quality_score=5.5,
        tags=["medium", "devops", "docker"]
    ),
    
    # Hard topics
    TestCase(
        id="hard_001",
        topic="machine learning fundamentals",
        expected_difficulty="hard",
        min_steps=5,
        max_steps=6,
        expected_keywords=["ML", "model", "training", "data"],
        min_quality_score=5.0,
        tags=["hard", "ml", "ai"]
    ),
    TestCase(
        id="hard_002",
        topic="system design interview prep",
        expected_difficulty="hard",
        min_steps=5,
        max_steps=6,
        expected_keywords=["system", "scalability", "design"],
        min_quality_score=5.0,
        tags=["hard", "system-design", "interview"]
    ),
    TestCase(
        id="hard_003",
        topic="Kubernetes orchestration",
        expected_difficulty="hard",
        min_steps=5,
        max_steps=6,
        expected_keywords=["Kubernetes", "pod", "cluster", "deployment"],
        min_quality_score=5.0,
        tags=["hard", "devops", "kubernetes"]
    ),
    
    # Edge cases
    TestCase(
        id="edge_001",
        topic="Python",  # Very broad topic
        min_steps=2,
        max_steps=6,
        min_quality_score=4.0,
        tags=["edge", "broad"]
    ),
    TestCase(
        id="edge_002",
        topic="advanced quantum computing algorithms",  # Very niche
        expected_difficulty="hard",
        min_steps=4,
        max_steps=6,
        min_quality_score=4.0,
        tags=["edge", "niche"]
    ),
]


# ============================================
# Test Runner
# ============================================
class RegressionTestRunner:
    """
    Runs regression tests against the learning plan generator.
    
    Usage:
        runner = RegressionTestRunner()
        results = await runner.run_experiment("v1.0-baseline")
    """
    
    def __init__(
        self,
        dataset: Optional[List[TestCase]] = None,
        enable_evaluation: bool = True
    ):
        self.dataset = dataset or GOLDEN_DATASET
        self.enable_evaluation = enable_evaluation
        self.experiments: List[ExperimentResult] = []
    
    async def run_single_test(
        self,
        test_case: TestCase,
        experiment_trace_id: Optional[str] = None
    ) -> TestResult:
        """Run a single test case"""
        errors = []
        start_time = datetime.utcnow()
        
        try:
            # Generate learning plan
            result = await generate_learning_plan(
                user_topic=test_case.topic,
                depth_level=1,
                enable_tracing=True,
                enable_evaluation=self.enable_evaluation
            )
            
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Extract results
            actual_difficulty = result.get("difficulty")
            actual_steps = result.get("total_steps", 0)
            trace_id = result.get("_observability", {}).get("trace_id")
            
            # Get evaluation scores
            eval_scores = {}
            if "_evaluations" in result:
                for ev in result["_evaluations"].get("evaluations", []):
                    eval_scores[ev["dimension"]] = ev["score"]
            
            quality_score = result.get("_evaluations", {}).get("overall_score", 0)
            
            # Validate against expected values
            passed = True
            
            # Check difficulty (if expected)
            if test_case.expected_difficulty and actual_difficulty != test_case.expected_difficulty:
                errors.append(f"Difficulty mismatch: expected {test_case.expected_difficulty}, got {actual_difficulty}")
                # Don't fail on difficulty mismatch alone
            
            # Check step count
            if actual_steps < test_case.min_steps:
                errors.append(f"Too few steps: expected >= {test_case.min_steps}, got {actual_steps}")
                passed = False
            if actual_steps > test_case.max_steps:
                errors.append(f"Too many steps: expected <= {test_case.max_steps}, got {actual_steps}")
                passed = False
            
            # Check quality score
            if quality_score < test_case.min_quality_score:
                errors.append(f"Quality too low: expected >= {test_case.min_quality_score}, got {quality_score}")
                passed = False
            
            # Check for expected keywords in step titles
            if test_case.expected_keywords:
                step_titles = " ".join(
                    s.get("title", "").lower() 
                    for s in result.get("learning_steps", [])
                )
                missing_keywords = [
                    kw for kw in test_case.expected_keywords
                    if kw.lower() not in step_titles
                ]
                if len(missing_keywords) > len(test_case.expected_keywords) / 2:
                    errors.append(f"Missing keywords: {missing_keywords}")
                    # Warning but don't fail
            
            return TestResult(
                test_id=test_case.id,
                passed=passed,
                actual_difficulty=actual_difficulty,
                actual_steps=actual_steps,
                quality_score=quality_score,
                evaluation_scores=eval_scores,
                errors=errors,
                duration_ms=duration_ms,
                trace_id=trace_id
            )
            
        except Exception as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            return TestResult(
                test_id=test_case.id,
                passed=False,
                errors=[f"Exception: {str(e)}"],
                duration_ms=duration_ms
            )
    
    async def run_experiment(
        self,
        experiment_name: str,
        test_cases: Optional[List[TestCase]] = None,
        metadata: Optional[Dict] = None
    ) -> ExperimentResult:
        """
        Run a full regression experiment.
        
        Args:
            experiment_name: Name for this experiment (e.g., "v1.0-baseline", "prompt-v2")
            test_cases: Optional subset of test cases to run
            metadata: Additional metadata to record
        """
        cases = test_cases or self.dataset
        experiment_id = f"{experiment_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Start experiment trace
        trace_id = start_trace(
            f"Experiment:{experiment_name}",
            metadata={
                "experiment_id": experiment_id,
                "total_tests": len(cases),
                **(metadata or {})
            },
            tags=["experiment", "regression"]
        )
        
        print(f"\n{'='*60}")
        print(f"[EXPERIMENT] Starting: {experiment_name}")
        print(f"[EXPERIMENT] ID: {experiment_id}")
        print(f"[EXPERIMENT] Test Cases: {len(cases)}")
        print(f"{'='*60}\n")
        
        results = []
        for i, test_case in enumerate(cases):
            print(f"[TEST {i+1}/{len(cases)}] Running: {test_case.id} - '{test_case.topic}'")
            
            result = await self.run_single_test(test_case, trace_id)
            results.append(result)
            
            status = "PASS" if result.passed else "FAIL"
            print(f"[TEST {i+1}/{len(cases)}] {status} - Score: {result.quality_score:.1f}/10")
            if result.errors:
                for error in result.errors:
                    print(f"    ERROR: {error}")
        
        # Calculate statistics
        passed = sum(1 for r in results if r.passed)
        failed = len(results) - passed
        pass_rate = passed / len(results) if results else 0
        
        quality_scores = [r.quality_score for r in results if r.quality_score > 0]
        avg_quality = statistics.mean(quality_scores) if quality_scores else 0
        
        durations = [r.duration_ms for r in results]
        avg_duration = statistics.mean(durations) if durations else 0
        
        # Create experiment result
        experiment_result = ExperimentResult(
            experiment_name=experiment_name,
            experiment_id=experiment_id,
            timestamp=datetime.utcnow().isoformat(),
            total_tests=len(results),
            passed_tests=passed,
            failed_tests=failed,
            pass_rate=pass_rate,
            avg_quality_score=avg_quality,
            avg_duration_ms=avg_duration,
            results=results,
            metadata=metadata or {}
        )
        
        # Log to OPIK
        log_metric(trace_id, "pass_rate", pass_rate)
        log_metric(trace_id, "avg_quality_score", avg_quality)
        log_metric(trace_id, "avg_duration_ms", avg_duration)
        log_feedback(trace_id, "experiment_result", pass_rate * 10, f"{passed}/{len(results)} tests passed", "experiment")
        
        end_trace(
            trace_id,
            output={
                "pass_rate": pass_rate,
                "passed": passed,
                "failed": failed,
                "avg_quality": avg_quality
            },
            status="success" if pass_rate >= 0.8 else "partial"
        )
        
        # Store experiment
        self.experiments.append(experiment_result)
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"[EXPERIMENT] Completed: {experiment_name}")
        print(f"{'='*60}")
        print(f"Pass Rate: {pass_rate*100:.1f}% ({passed}/{len(results)})")
        print(f"Avg Quality Score: {avg_quality:.2f}/10")
        print(f"Avg Duration: {avg_duration:.0f}ms")
        print(f"{'='*60}\n")
        
        return experiment_result
    
    async def run_ab_test(
        self,
        baseline_name: str,
        variant_name: str,
        test_cases: Optional[List[TestCase]] = None,
        baseline_config: Optional[Dict] = None,
        variant_config: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Run an A/B test comparing two configurations.
        
        Note: This is a placeholder - actual config changes would need
        to be implemented based on what you're testing.
        """
        cases = test_cases or self.dataset
        
        print(f"\n[A/B TEST] Running comparison: {baseline_name} vs {variant_name}")
        
        # Run baseline
        baseline_result = await self.run_experiment(
            baseline_name,
            cases,
            metadata={"type": "baseline", "config": baseline_config}
        )
        
        # Run variant
        variant_result = await self.run_experiment(
            variant_name,
            cases,
            metadata={"type": "variant", "config": variant_config}
        )
        
        # Compare results
        comparison = {
            "baseline": baseline_name,
            "variant": variant_name,
            "baseline_pass_rate": baseline_result.pass_rate,
            "variant_pass_rate": variant_result.pass_rate,
            "pass_rate_diff": variant_result.pass_rate - baseline_result.pass_rate,
            "baseline_quality": baseline_result.avg_quality_score,
            "variant_quality": variant_result.avg_quality_score,
            "quality_diff": variant_result.avg_quality_score - baseline_result.avg_quality_score,
            "baseline_duration": baseline_result.avg_duration_ms,
            "variant_duration": variant_result.avg_duration_ms,
            "duration_diff": variant_result.avg_duration_ms - baseline_result.avg_duration_ms,
            "winner": "variant" if variant_result.pass_rate > baseline_result.pass_rate else "baseline",
            "statistically_significant": abs(variant_result.pass_rate - baseline_result.pass_rate) > 0.1
        }
        
        print(f"\n[A/B TEST] Results:")
        print(f"  Pass Rate: {baseline_name}={baseline_result.pass_rate:.1%} vs {variant_name}={variant_result.pass_rate:.1%}")
        print(f"  Quality: {baseline_name}={baseline_result.avg_quality_score:.2f} vs {variant_name}={variant_result.avg_quality_score:.2f}")
        print(f"  Winner: {comparison['winner']}")
        
        return comparison
    
    def get_experiment_history(self) -> List[Dict]:
        """Get all experiment results"""
        return [e.to_dict() for e in self.experiments]
    
    def save_results(self, filepath: str):
        """Save experiment results to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.get_experiment_history(), f, indent=2)
    
    def load_results(self, filepath: str):
        """Load experiment results from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
            # Convert back to ExperimentResult objects if needed
            return data


# ============================================
# Convenience Functions
# ============================================
async def run_quick_regression(
    topics: Optional[List[str]] = None
) -> ExperimentResult:
    """
    Run a quick regression test with default or custom topics.
    
    Args:
        topics: Optional list of topics to test
    """
    if topics:
        test_cases = [
            TestCase(id=f"quick_{i}", topic=t, min_quality_score=4.0)
            for i, t in enumerate(topics)
        ]
    else:
        # Use a small subset of golden dataset
        test_cases = GOLDEN_DATASET[:5]
    
    runner = RegressionTestRunner(dataset=test_cases)
    return await runner.run_experiment("quick_regression")


async def run_full_regression() -> ExperimentResult:
    """Run full regression test with golden dataset"""
    runner = RegressionTestRunner()
    return await runner.run_experiment("full_regression")


# ============================================
# CLI Entry Point
# ============================================
if __name__ == "__main__":
    async def main():
        print("LearnTube AI - Regression Test Suite")
        print("="*50)
        
        # Run quick regression
        result = await run_quick_regression()
        
        print(f"\nFinal Pass Rate: {result.pass_rate*100:.1f}%")
        print(f"Average Quality: {result.avg_quality_score:.2f}/10")
    
    asyncio.run(main())
