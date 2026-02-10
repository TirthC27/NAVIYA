"""
LLMProvider - Unified LLM Interface for NAVIYA

Responsibilities:
- Accept prompt + context
- Call OpenRouter API via call_gemini()
- Return raw LLM output
- Handle retries and timeouts
- Log all requests

Frontend MUST NOT call OpenRouter directly.
All LLM calls go through this provider.
"""

import httpx
import asyncio
import uuid
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.config import settings
from app.agents.llm import call_gemini, LLMError


# ============================================
# Configuration
# ============================================

class LLMModel(str, Enum):
    """Supported LLM models"""
    GEMMA_7B = "google/gemma-7b-it"
    GEMINI_FLASH = "google/gemini-2.0-flash-001"
    GEMINI_PRO = "google/gemini-pro"


class LLMConfig(BaseModel):
    """LLM configuration"""
    model: str = LLMModel.GEMMA_7B.value
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    top_p: float = Field(default=0.95, ge=0, le=1)
    timeout: float = Field(default=60.0, ge=5)
    max_retries: int = Field(default=3, ge=1, le=5)
    retry_delay: float = Field(default=1.0, ge=0.5)


# Default configuration
DEFAULT_CONFIG = LLMConfig()


# ============================================
# Request/Response Models
# ============================================

class LLMMessage(BaseModel):
    """Single message in conversation"""
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class LLMRequest(BaseModel):
    """LLM request structure"""
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_name: str
    messages: List[LLMMessage]
    config: Optional[LLMConfig] = None
    metadata: Optional[Dict[str, Any]] = None


class LLMResponse(BaseModel):
    """LLM response structure"""
    request_id: str
    agent_name: str
    model_used: str
    content: str
    usage: Optional[Dict[str, int]] = None
    latency_ms: float
    success: bool
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ============================================
# LLMProvider Class
# ============================================

class LLMProvider:
    """
    Unified LLM provider for all NAVIYA agents.
    
    Usage:
        provider = LLMProvider()
        response = await provider.complete(
            agent_name="RoadmapAgent",
            system_prompt="You are a career advisor...",
            user_prompt="Create a roadmap for...",
            config=LLMConfig(temperature=0.5)
        )
    """
    
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured. Set OPENROUTER_API_KEY in environment.")
        
        self._request_log: List[Dict] = []
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for OpenRouter API"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://naviya.ai",
            "X-Title": "NAVIYA Career Platform"
        }
    
    async def complete(
        self,
        agent_name: str,
        system_prompt: str,
        user_prompt: str,
        config: Optional[LLMConfig] = None,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LLMResponse:
        """
        Complete a prompt using the LLM.
        
        Args:
            agent_name: Name of the calling agent (for logging)
            system_prompt: System instructions
            user_prompt: User message/task
            config: LLM configuration (temperature, max_tokens, etc.)
            context: Additional context to include
            metadata: Additional metadata for logging
            
        Returns:
            LLMResponse with content or error
        """
        config = config or DEFAULT_CONFIG
        request_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        # Combine context with user prompt if provided
        full_prompt = user_prompt
        if context:
            full_prompt = f"Context:\n{context}\n\n---\n\n{user_prompt}"
        
        # Log request
        self._log_request(request_id, agent_name, config.model, {
            "system_prompt": system_prompt[:100],
            "user_prompt": full_prompt[:100]
        })
        
        # Execute with retries
        last_error = None
        for attempt in range(config.max_retries):
            try:
                # Use the existing call_gemini function
                content = await call_gemini(
                    prompt=full_prompt,
                    system_prompt=system_prompt
                )
                
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                llm_response = LLMResponse(
                    request_id=request_id,
                    agent_name=agent_name,
                    model_used=config.model,
                    content=content,
                    usage={},  # call_gemini doesn't return usage stats
                    latency_ms=latency_ms,
                    success=True
                )
                
                self._log_response(request_id, llm_response)
                return llm_response
                
            except LLMError as e:
                last_error = str(e)
                if "402" in last_error or "credits" in last_error.lower():
                    # Payment required - don't retry
                    break
                # Retry on other errors
                await asyncio.sleep(config.retry_delay * (attempt + 1))
                continue
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                await asyncio.sleep(config.retry_delay)
                continue
        
        # All retries failed
        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        llm_response = LLMResponse(
            request_id=request_id,
            agent_name=agent_name,
            model_used=config.model,
            content="",
            latency_ms=latency_ms,
            success=False,
            error=last_error
        )
        
        self._log_response(request_id, llm_response)
        return llm_response
    
    async def complete_structured(
        self,
        agent_name: str,
        system_prompt: str,
        user_prompt: str,
        config: Optional[LLMConfig] = None,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete a prompt and parse JSON response.
        
        Returns parsed JSON or error dict.
        """
        response = await self.complete(
            agent_name=agent_name,
            system_prompt=system_prompt + "\n\nOutput ONLY valid JSON. No markdown, no explanation.",
            user_prompt=user_prompt,
            config=config,
            context=context
        )
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        # Parse JSON from response
        try:
            content = response.content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            # Find JSON object
            start = content.find("{")
            end = content.rfind("}") + 1
            
            if start != -1 and end > start:
                parsed = json.loads(content[start:end])
                return {"success": True, "data": parsed, "request_id": response.request_id}
            else:
                return {"success": False, "error": "No JSON object found in response", "raw": response.content}
                
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parse error: {str(e)}", "raw": response.content}
    
    def _log_request(self, request_id: str, agent_name: str, model: str, payload: Dict) -> None:
        """Log LLM request"""
        log_entry = {
            "type": "request",
            "request_id": request_id,
            "agent_name": agent_name,
            "model_used": model,
            "timestamp": datetime.utcnow().isoformat(),
            "prompt_length": sum(len(m["content"]) for m in payload["messages"])
        }
        self._request_log.append(log_entry)
        
        # Keep only last 100 entries
        if len(self._request_log) > 100:
            self._request_log = self._request_log[-100:]
        
        print(f"[LLM] Request {request_id[:8]} | Agent: {agent_name} | Model: {model}")
    
    def _log_response(self, request_id: str, response: LLMResponse) -> None:
        """Log LLM response"""
        log_entry = {
            "type": "response",
            "request_id": request_id,
            "agent_name": response.agent_name,
            "model_used": response.model_used,
            "success": response.success,
            "latency_ms": response.latency_ms,
            "error": response.error,
            "timestamp": datetime.utcnow().isoformat()
        }
        self._request_log.append(log_entry)
        
        status = "OK" if response.success else "FAIL"
        print(f"[LLM] Response {request_id[:8]} | {status} | {response.latency_ms:.0f}ms")
    
    def get_request_log(self) -> List[Dict]:
        """Get request log for debugging"""
        return self._request_log.copy()


# ============================================
# Singleton Instance
# ============================================

_provider_instance: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """Get singleton LLMProvider instance"""
    global _provider_instance
    if _provider_instance is None:
        _provider_instance = LLMProvider()
    return _provider_instance


# ============================================
# Convenience Functions
# ============================================

async def llm_complete(
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    model: str = LLMModel.GEMMA_7B.value
) -> LLMResponse:
    """
    Convenience function for LLM completion.
    
    Usage:
        response = await llm_complete(
            agent_name="RoadmapAgent",
            system_prompt="You are...",
            user_prompt="Create...",
            temperature=0.5
        )
    """
    provider = get_llm_provider()
    config = LLMConfig(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return await provider.complete(
        agent_name=agent_name,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        config=config
    )


async def llm_complete_json(
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.5,
    model: str = LLMModel.GEMMA_7B.value
) -> Dict[str, Any]:
    """
    Convenience function for structured JSON completion.
    
    Usage:
        result = await llm_complete_json(
            agent_name="SkillEvaluationAgent",
            system_prompt="Generate questions...",
            user_prompt="Topic: Python"
        )
        if result["success"]:
            data = result["data"]
    """
    provider = get_llm_provider()
    config = LLMConfig(
        model=model,
        temperature=temperature
    )
    return await provider.complete_structured(
        agent_name=agent_name,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        config=config
    )
