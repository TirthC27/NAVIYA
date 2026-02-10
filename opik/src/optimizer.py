"""optimizer.py - Prompt optimization using MetaPromptOptimizer."""

from src.config import settings
from src.dataset import get_client, create_dataset, containment_metric

from opik_optimizer import MetaPromptOptimizer, ChatPrompt


def optimize(
    model: str = "openrouter/openai/gpt-4o-mini",
    n_samples: int = 4,
    max_trials: int = 5,
):
    """Run prompt optimization against the evaluation dataset."""
    settings.validate()

    # Get Opik client and dataset
    client = get_client()
    dataset = create_dataset(client)

    # Define the initial prompt template
    prompt = ChatPrompt(
        messages=[
            {
                "role": "system",
                "content": "You are a precise, concise assistant.",
            },
            {
                "role": "user",
                "content": "{query}",
            },
        ],
        model=model,
    )

    # Create the optimizer
    optimizer = MetaPromptOptimizer(model=model)

    # Run optimization (this includes evaluation internally)
    print(f"Running optimization: {max_trials} trials x {n_samples} samples...")
    result = optimizer.optimize_prompt(
        prompt=prompt,
        dataset=dataset,
        metric=containment_metric,
        n_samples=n_samples,
        max_trials=max_trials,
    )

    # Display results
    result.display()
    return result
