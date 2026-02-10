"""main.py - CLI runner for the Opik v3 test workflow."""

import argparse
import sys
from src.config import settings


def step_llm_wrapper():
    from src.llm_wrapper import query_llm, call_model
    print("\n-- LLM Wrapper --")
    print(query_llm("What is Opik?"))
    print(call_model("Explain trace logging in one sentence."))


def step_pipeline():
    from src.pipeline import run_pipeline
    print("\n-- Pipeline --")
    print(run_pipeline("What is Opik and how does trace logging work?"))


def step_optimizer():
    from src.optimizer import optimize
    print("\n-- Optimizer (includes evaluation) --")
    optimize(n_samples=2, max_trials=3)


def step_monitoring():
    from src.monitoring import online_quality_gate, dashboard_info
    print("\n-- Monitoring --")
    online_quality_gate("Opik is an LLM observability platform.")
    online_quality_gate("")
    dashboard_info()


STEPS = {
    "llm_wrapper": step_llm_wrapper,
    "pipeline": step_pipeline,
    "optimizer": step_optimizer,
    "monitoring": step_monitoring,
}


def main():
    parser = argparse.ArgumentParser(description="Opik v3 Test Runner")
    parser.add_argument(
        "--step",
        choices=list(STEPS.keys()),
        default=None,
        help="Run a single step (default: all).",
    )
    args = parser.parse_args()

    settings.validate()
    print(f"[opik] workspace={settings.OPIK_WORKSPACE}  project={settings.OPIK_PROJECT}")

    if args.step:
        STEPS[args.step]()
    else:
        for name, fn in STEPS.items():
            try:
                fn()
            except Exception as exc:
                print(f"[WARN] Step '{name}' failed: {exc}", file=sys.stderr)

    print("\nDone. Check your Opik dashboard for traces and results.")


if __name__ == "__main__":
    main()
