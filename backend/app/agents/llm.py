"""
LearnTube AI - Gemini LLM Connector
Connects to Gemini model via OpenRouter API
"""

import httpx
from typing import Optional
from app.config import settings


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class LLMError(Exception):
    """Custom exception for LLM errors"""
    pass


async def call_gemini(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Call Gemini model via OpenRouter API
    
    Args:
        prompt: The user prompt to send to the model
        system_prompt: Optional system prompt for context
        
    Returns:
        Clean response text from the model
        
    Raises:
        LLMError: If the API call fails
    """
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://learntube.ai",
        "X-Title": "LearnTube AI"
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
        "messages": messages
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 402:
                raise LLMError("OpenRouter API requires credits. Please add credits at https://openrouter.ai/credits")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract clean response text
            content = data["choices"][0]["message"]["content"]
            return content.strip()
            
    except httpx.HTTPStatusError as e:
        raise LLMError(f"API request failed: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        raise LLMError(f"Network error: {str(e)}")
    except (KeyError, IndexError) as e:
        raise LLMError(f"Unexpected API response format: {str(e)}")


def call_gemini_sync(prompt: str, system_prompt: Optional[str] = None) -> str:
    """
    Synchronous version of call_gemini for non-async contexts
    
    Args:
        prompt: The user prompt to send to the model
        system_prompt: Optional system prompt for context
        
    Returns:
        Clean response text from the model
        
    Raises:
        LLMError: If the API call fails
    """
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://learntube.ai",
        "X-Title": "LearnTube AI"
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
        "messages": messages
    }
    
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 402:
                raise LLMError("OpenRouter API requires credits. Please add credits at https://openrouter.ai/credits")
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract clean response text
            content = data["choices"][0]["message"]["content"]
            return content.strip()
            
    except httpx.HTTPStatusError as e:
        raise LLMError(f"API request failed: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        raise LLMError(f"Network error: {str(e)}")
    except (KeyError, IndexError) as e:
        raise LLMError(f"Unexpected API response format: {str(e)}")


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
