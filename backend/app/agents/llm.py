"""
Naviya AI - Gemini LLM Connector
Connects to Gemini model via OpenRouter API
All calls are traced via Opik for full observability.
"""

import httpx
import time
from typing import Optional
from app.config import settings
from app.observability.opik_client import (
    start_trace, end_trace, create_span_async, create_span,
    is_opik_enabled,
)
from app.observability.request_metrics import store_opik_metrics


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class LLMError(Exception):
    """Custom exception for LLM errors"""
    pass


async def call_gemini(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Call Gemini model via OpenRouter API.
    Automatically traced via Opik for observability.
    
    Args:
        prompt: The user prompt to send to the model
        system_prompt: Optional system prompt for context
        
    Returns:
        Clean response text from the model
        
    Raises:
        LLMError: If the API call fails
    """
    # Start Opik trace
    trace_id = start_trace(
        "LLM_call_gemini",
        metadata={
            "model": settings.GEMINI_MODEL,
            "prompt_length": len(prompt),
            "has_system_prompt": system_prompt is not None,
        },
        tags=["llm", "gemini", "async"],
    )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://resume-ai-agent-parser.local",
        "X-Title": "Resume AI Agent Parser"
    }
    
    messages = []
    
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt
        })
    
    messages.append({
        "role": "user",
        "content": prompt
    })
    
    payload = {
        "model": settings.GEMINI_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 8000
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            t0 = time.time()
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            latency_ms = (time.time() - t0) * 1000
            
            if response.status_code == 402:
                end_trace(trace_id, output={"error": "credits_required"}, status="error")
                raise LLMError("OpenRouter API requires credits. Please add credits at https://openrouter.ai/credits")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract clean response text
            content = data["choices"][0]["message"]["content"]
            result = content.strip()

            # Extract token usage if available
            usage = data.get("usage", {})

            _model = data.get("model", settings.GEMINI_MODEL)
            _pt = usage.get("prompt_tokens", 0)
            _ct = usage.get("completion_tokens", 0)
            _tt = usage.get("total_tokens", 0)

            end_trace(trace_id, output={
                "response_length": len(result),
                "latency_ms": round(latency_ms, 1),
                "model": _model,
                "prompt_tokens": _pt,
                "completion_tokens": _ct,
                "total_tokens": _tt,
            }, status="success")

            # Store metrics for the Opik toast middleware
            store_opik_metrics(
                agent_name="LLM_call_gemini",
                latency_ms=latency_ms,
                model=_model,
                status="success",
                prompt_tokens=_pt,
                completion_tokens=_ct,
                total_tokens=_tt,
                trace_id=trace_id or "",
            )

            return result
            
    except httpx.HTTPStatusError as e:
        end_trace(trace_id, output={"error": f"HTTP {e.response.status_code}"}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini", latency_ms=(time.time()-t0)*1000 if 't0' in dir() else 0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"API request failed: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"Network error: {str(e)}")
    except (KeyError, IndexError) as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"Unexpected API response format: {str(e)}")
    except LLMError:
        raise  # Already traced above
    except Exception as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise


def call_gemini_sync(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Synchronous version of call_gemini for non-async contexts.
    Automatically traced via Opik for observability.
    
    Args:
        prompt: The user prompt to send to the model
        system_prompt: Optional system prompt for context
        
    Returns:
        Clean response text from the model
        
    Raises:
        LLMError: If the API call fails
    """
    # Start Opik trace
    trace_id = start_trace(
        "LLM_call_gemini_sync",
        metadata={
            "model": settings.GEMINI_MODEL,
            "prompt_length": len(prompt),
            "has_system_prompt": system_prompt is not None,
        },
        tags=["llm", "gemini", "sync"],
    )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://resume-ai-agent-parser.local",
        "X-Title": "Resume AI Agent Parser"
    }
    
    messages = []
    
    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt
        })
    
    messages.append({
        "role": "user",
        "content": prompt
    })
    
    payload = {
        "model": settings.GEMINI_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 8000
    }
    
    try:
        with httpx.Client(timeout=60.0) as client:
            t0 = time.time()
            response = client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            latency_ms = (time.time() - t0) * 1000
            
            if response.status_code == 402:
                end_trace(trace_id, output={"error": "credits_required"}, status="error")
                raise LLMError("OpenRouter API requires credits. Please add credits at https://openrouter.ai/credits")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract clean response text
            content = data["choices"][0]["message"]["content"]
            result = content.strip()

            usage = data.get("usage", {})

            _model = data.get("model", settings.GEMINI_MODEL)
            _pt = usage.get("prompt_tokens", 0)
            _ct = usage.get("completion_tokens", 0)
            _tt = usage.get("total_tokens", 0)

            end_trace(trace_id, output={
                "response_length": len(result),
                "latency_ms": round(latency_ms, 1),
                "model": _model,
                "prompt_tokens": _pt,
                "completion_tokens": _ct,
                "total_tokens": _tt,
            }, status="success")

            store_opik_metrics(
                agent_name="LLM_call_gemini_sync",
                latency_ms=latency_ms,
                model=_model,
                status="success",
                prompt_tokens=_pt,
                completion_tokens=_ct,
                total_tokens=_tt,
                trace_id=trace_id or "",
            )

            return result
            
    except httpx.HTTPStatusError as e:
        end_trace(trace_id, output={"error": f"HTTP {e.response.status_code}"}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini_sync", latency_ms=(time.time()-t0)*1000 if 't0' in dir() else 0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"API request failed: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini_sync", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"Network error: {str(e)}")
    except (KeyError, IndexError) as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini_sync", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise LLMError(f"Unexpected API response format: {str(e)}")
    except LLMError:
        raise
    except Exception as e:
        end_trace(trace_id, output={"error": str(e)}, status="error")
        store_opik_metrics(agent_name="LLM_call_gemini_sync", latency_ms=0, model=settings.GEMINI_MODEL, status="error")
        raise


# Test function
if __name__ == "__main__":
    import asyncio
    
    async def test():
        prompt = "Generate 3 search queries for learning BFS"
        print(f"Prompt: {prompt}\n")
        print("Response:")
        result = await call_gemini(prompt)
        print(result)
    
    asyncio.run(test())
