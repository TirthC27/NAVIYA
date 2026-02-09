"""
Topic Explainer API Routes

Endpoints:
  POST /api/topic-explainer/generate   — Research topic + generate slides + narration
  GET  /api/topic-explainer/slide-image/{session_id}/{slide_number} — Serve slide image
"""

import os
import json
import uuid
import base64
import time
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import httpx

from app.config import settings

router = APIRouter(prefix="/api/topic-explainer", tags=["Topic Explainer"])

# ── Config ──────────────────────────────────────────────────
# Hard-coded key as requested (NOT from system env)
OPENROUTER_API_KEY = "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"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
RESEARCH_MODEL = "perplexity/sonar"            # fast; switch to "perplexity/sonar-deep-research" for deeper (slower) results
IMAGE_MODEL = "google/gemini-3-pro-image-preview"
NARRATION_MODEL = "google/gemini-2.0-flash-001"

# In-memory session store  (production → use Redis / DB)
_sessions: Dict[str, Dict] = {}


# ── Schemas ─────────────────────────────────────────────────

class TopicRequest(BaseModel):
    topic: str
    user_id: Optional[str] = None


class SlideData(BaseModel):
    slide_number: int
    title: str
    subtitle: str
    content_sections: List[Dict[str, Any]]
    narration_text: str
    has_image: bool = False


class GenerateResponse(BaseModel):
    success: bool
    session_id: str
    topic: str
    slides: List[Dict[str, Any]]
    error: Optional[str] = None


# ── Helper: call OpenRouter ────────────────────────────────

async def _openrouter_chat(
    model: str,
    messages: List[Dict],
    max_tokens: int = 4096,
    temperature: float = 0.7,
    extra_body: Optional[Dict] = None,
) -> str:
    """Generic OpenRouter chat completion call."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://naviya.app",
        "X-Title": "NAVIYA Topic Explainer",
    }
    body: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if extra_body:
        body.update(extra_body)

    last_error = None
    for attempt in range(1, 4):  # up to 3 retries
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=body,
                )
            if resp.status_code != 200:
                detail = resp.text[:400]
                last_error = f"OpenRouter error ({resp.status_code}): {detail}"
                print(f"  [chat] Attempt {attempt} failed: {last_error}")
                if resp.status_code in (429, 502, 503, 504):
                    import asyncio as _aio
                    await _aio.sleep(attempt * 5)
                    continue
                raise HTTPException(status_code=502, detail=last_error)

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                last_error = "No choices returned from OpenRouter"
                print(f"  [chat] Attempt {attempt}: {last_error}")
                continue

            content = choices[0]["message"].get("content", "")
            if not content or not content.strip():
                last_error = "Empty content in OpenRouter response"
                print(f"  [chat] Attempt {attempt}: {last_error}")
                continue

            return content

        except HTTPException:
            raise
        except Exception as exc:
            last_error = str(exc)
            print(f"  [chat] Attempt {attempt} exception: {last_error}")
            if attempt < 3:
                import asyncio as _aio
                await _aio.sleep(attempt * 3)
                continue

    raise HTTPException(status_code=502, detail=f"Failed after 3 attempts: {last_error}")


# ── Step 1: Deep research ──────────────────────────────────

async def research_topic(topic: str) -> str:
    """Use Perplexity Sonar Deep Research to build rich knowledge about the topic."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert researcher. Provide a comprehensive, well-structured "
                "explanation of the given topic. Cover: definition, core concepts, key "
                "principles, real-world applications, important frameworks/models, "
                "metrics/KPIs, risks/challenges, and future outlook. "
                "Write in clear, professional language suitable for turning into a "
                "5-slide MBA-style presentation."
            ),
        },
        {"role": "user", "content": f"Research this topic thoroughly: {topic}"},
    ]
    return await _openrouter_chat(RESEARCH_MODEL, messages, max_tokens=8192, temperature=0.4)


# ── Step 2: Generate structured slides ─────────────────────

SLIDE_STRUCTURE_PROMPT = """You are a presentation architect. Given detailed research on a topic,
create exactly 5 structured presentation slides.

Return ONLY valid JSON (no markdown fences) with this exact schema:
{{
  "slides": [
    {{
      "slide_number": 1,
      "title": "Slide title (short)",
      "subtitle": "One-line subtitle",
      "sections": [
        {{
          "heading": "Section heading",
          "bullets": ["bullet 1", "bullet 2", "bullet 3"]
        }}
      ],
      "key_takeaway": "One sentence summary of this slide",
      "narration": "A 40-60 second spoken narration script for this slide. Speak as a knowledgeable presenter explaining to a professional audience. Be engaging, clear, and informative. Do NOT use any markdown, special characters, or formatting symbols."
    }}
  ]
}}

Slide plan:
  Slide 1 — Strategic Overview (What is it, why it matters)
  Slide 2 — Core Concepts & Framework (Key principles, architecture)
  Slide 3 — Implementation & Metrics (How to execute, KPIs)
  Slide 4 — Challenges & Risk Management (Pitfalls, mitigation)
  Slide 5 — Future Roadmap & Conclusion (Trends, next steps, summary)

Each slide must have 3-5 sections with 2-4 bullets each.
Each narration must be 40-60 seconds when spoken aloud (~100-150 words)."""


async def generate_slide_structure(topic: str, research: str) -> List[Dict]:
    """Turn research into structured slide JSON."""
    messages = [
        {"role": "system", "content": SLIDE_STRUCTURE_PROMPT},
        {
            "role": "user",
            "content": f"Topic: {topic}\n\nResearch:\n{research}\n\nGenerate the 5-slide JSON structure now.",
        },
    ]
    raw = await _openrouter_chat(NARRATION_MODEL, messages, max_tokens=6000, temperature=0.5)

    # Strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        return parsed.get("slides", parsed) if isinstance(parsed, dict) else parsed
    except json.JSONDecodeError:
        # Attempt to extract JSON from response
        import re
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            parsed = json.loads(m.group())
            return parsed.get("slides", [parsed])
        raise HTTPException(status_code=502, detail="Failed to parse slide JSON from LLM")


# ── Step 3: Generate slide images ──────────────────────────

def _build_image_prompt(topic: str, slide: Dict) -> str:
    """Build a prompt for an MBA-style slide image."""
    sections_text = ""
    for sec in slide.get("sections", []):
        bullets = ", ".join(sec.get("bullets", [])[:3])
        sections_text += f"\n• {sec['heading']}: {bullets}"

    return (
        f"Generate a professional MBA presentation slide image. "
        f"MUST be wide landscape 16:9 aspect ratio (widescreen like PowerPoint). "
        f"Enterprise-grade design.\n\n"
        f"Title: \"{slide['title']}\"\n"
        f"Subtitle: \"{slide.get('subtitle', '')}\"\n"
        f"Content sections:{sections_text}\n\n"
        f"Style: Muted blues/greens/greys, clean grid layout, flat icons, "
        f"sans-serif fonts, McKinsey-style, readable text, "
        f"slide {slide['slide_number']}/5 footer. "
        f"IMPORTANT: landscape/widescreen orientation."
    )


async def generate_slide_image(topic: str, slide: Dict) -> Optional[bytes]:
    """Generate one slide image via OpenRouter image model."""
    prompt = _build_image_prompt(topic, slide)
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://naviya.app",
        "X-Title": "NAVIYA PPT Generator",
    }
    body = {
        "model": IMAGE_MODEL,
        "max_tokens": 4096,
        "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": prompt}],
    }

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=body,
            )
        if resp.status_code != 200:
            print(f"  [img] API error {resp.status_code}: {resp.text[:200]}")
            return None

        data = resp.json()
        message = data.get("choices", [{}])[0].get("message", {})

        # Try extracting inline_data / base64 from various response shapes
        content = message.get("content", "")

        # content may be a list of parts
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "image_url":
                        url = part.get("image_url", {}).get("url", "")
                        if url.startswith("data:image"):
                            return base64.b64decode(url.split(",", 1)[1])
                    if part.get("type") == "image":
                        b64 = part.get("data", "") or part.get("b64_json", "")
                        if b64:
                            return base64.b64decode(b64)

        # content may be a data-url string
        if isinstance(content, str) and content.startswith("data:image"):
            return base64.b64decode(content.split(",", 1)[1])

        # Check message.images
        for img in message.get("images", []):
            url = img.get("image_url", {}).get("url", "")
            if url.startswith("data:image"):
                return base64.b64decode(url.split(",", 1)[1])

        print(f"  [img] Could not extract image from response")
        return None

    except Exception as e:
        print(f"  [img] Exception: {e}")
        return None


# ── Main endpoint ──────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_topic_presentation(req: TopicRequest):
    """
    Full pipeline: research → structured slides → images → narration text.
    Returns slide data with narration scripts (voice synthesis happens on frontend).
    """
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    session_id = str(uuid.uuid4())
    print(f"\n{'='*50}")
    print(f"🎓 Topic Explainer: '{topic}'  session={session_id[:8]}")
    print(f"{'='*50}")

    try:
        # ── 1. Research ──
        print("  📚 Step 1/3: Deep research via Perplexity …")
        research = await research_topic(topic)
        print(f"  ✓ Research complete ({len(research)} chars)")

        # ── 2. Slide structure + narration ──
        print("  🏗️  Step 2/3: Generating slide structure …")
        slides = await generate_slide_structure(topic, research)
        print(f"  ✓ {len(slides)} slides generated")

        # ── 3. Images (parallel, best-effort) ──
        print("  🎨 Step 3/3: Generating slide images …")
        image_tasks = [generate_slide_image(topic, s) for s in slides]
        image_results = await asyncio.gather(*image_tasks, return_exceptions=True)

        # Store images in session
        session_images: Dict[int, bytes] = {}
        for idx, img in enumerate(image_results):
            if isinstance(img, bytes) and len(img) > 100:
                slide_num = slides[idx].get("slide_number", idx + 1)
                session_images[slide_num] = img
                slides[idx]["has_image"] = True
                print(f"  ✓ Slide {slide_num} image ready")
            else:
                slides[idx]["has_image"] = False
                print(f"  ⚠ Slide {idx+1} image skipped")

        _sessions[session_id] = {
            "topic": topic,
            "slides": slides,
            "images": session_images,
            "created_at": datetime.utcnow().isoformat(),
        }

        print(f"  ✅ Done! {len(session_images)}/{len(slides)} images generated")

        # Build response slides (without raw image bytes)
        response_slides = []
        for s in slides:
            response_slides.append({
                "slide_number": s.get("slide_number", 0),
                "title": s.get("title", ""),
                "subtitle": s.get("subtitle", ""),
                "sections": s.get("sections", []),
                "key_takeaway": s.get("key_takeaway", ""),
                "narration": s.get("narration", ""),
                "has_image": s.get("has_image", False),
                "image_url": f"/api/topic-explainer/slide-image/{session_id}/{s.get('slide_number', 0)}"
                    if s.get("has_image") else None,
            })

        return GenerateResponse(
            success=True,
            session_id=session_id,
            topic=topic,
            slides=response_slides,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"  ❌ Pipeline error: {e}")
        return GenerateResponse(
            success=False,
            session_id=session_id,
            topic=topic,
            slides=[],
            error=str(e),
        )


@router.get("/slide-image/{session_id}/{slide_number}")
async def get_slide_image(session_id: str, slide_number: int):
    """Serve a generated slide image as PNG."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    image_bytes = session["images"].get(slide_number)
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Image not found for this slide")

    return Response(content=image_bytes, media_type="image/png")
