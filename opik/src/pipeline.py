"""pipeline.py - Multi-step traced RAG pipeline."""

from typing import Any
import opik
from openai import OpenAI
from src.config import settings

# Module-level OpenRouter client
_client = OpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url=settings.OPENROUTER_BASE_URL,
)


@opik.track(name="preprocess")
def preprocess(raw_input: str) -> str:
    """Clean and normalize user input."""
    return raw_input.strip().lower()


@opik.track(name="retrieve_docs")
def retrieve_docs(query: str) -> list[str]:
    """Retrieve relevant documents for the query (demo: hardcoded)."""
    return [
        "Opik is an open-source LLM observability platform by Comet. "
        "It provides tracing, evaluation, and prompt management.",
        "Trace logging records every LLM call with inputs, outputs, "
        "latency, and metadata for debugging and optimization.",
    ]


@opik.track(name="llm_generate")
def llm_generate(
    docs: list[str], query: str, model: str = "openai/gpt-4o-mini"
) -> str:
    """Generate an answer using the retrieved documents as context."""
    context = "\n\n".join(docs)
    response = _client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"Answer the question using ONLY this context:\n\n{context}"
                ),
            },
            {"role": "user", "content": query},
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content


@opik.track(name="postprocess")
def postprocess(text: str) -> dict[str, Any]:
    """Clean response and attach metadata."""
    text = text.strip()
    return {"answer": text, "char_count": len(text)}


@opik.track(name="full_pipeline")
def run_pipeline(raw_input: str) -> dict[str, Any]:
    """Run the complete RAG pipeline with nested tracing."""
    cleaned = preprocess(raw_input)
    docs = retrieve_docs(cleaned)
    generation = llm_generate(docs, cleaned)
    result = postprocess(generation)
    return result
