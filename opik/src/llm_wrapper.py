"""llm_wrapper.py - Traced LLM calls via OpenRouter."""

import opik
from openai import OpenAI
from src.config import settings

# Module-level OpenRouter client (reused for all calls)
_client = OpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
)


@opik.track(name="query_llm")
def query_llm(prompt: str, model: str = "openai/gpt-4o-mini") -> str:
    """Send a prompt to the LLM and return the response (max 120 tokens)."""
    response = _client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=120,
    )
    return response.choices[0].message.content


@opik.track(name="call_model")
def call_model(prompt: str, model: str = "openai/gpt-4o-mini") -> str:
    """Send a prompt to the LLM and return the full response (no token limit)."""
    response = _client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content
