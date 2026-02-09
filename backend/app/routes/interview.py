"""
Mock Interview API Routes

Endpoints:
  POST /api/interview/transcribe     — Upload audio → transcribe via OpenRouter Whisper
  POST /api/interview/evaluate       — Evaluate transcript via InterviewEvaluationAgent
  POST /api/interview/session        — Full pipeline: upload audio → transcribe → evaluate
  GET  /api/interview/sessions/{uid} — Get past interview sessions for a user
  POST /api/interview/chat           — Chat about interview results with AI
"""

import os
import json
import uuid
import tempfile
import subprocess
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import httpx

from app.config import settings
from app.agents.interview_evaluation_agent import (
    evaluate_interview,
    parse_transcript_to_qa_pairs,
)
from app.services.dashboard_state import get_dashboard_state_service

router = APIRouter(prefix="/api/interview", tags=["Mock Interview"])

SUPABASE_REST_URL = f"{settings.SUPABASE_URL}/rest/v1"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def _get_supabase_headers():
    return {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ============================================
# Audio conversion helper
# ============================================

def _convert_webm_to_wav(input_path: str, output_path: str) -> bool:
    """Convert webm/ogg audio to 16kHz mono WAV via ffmpeg"""
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                output_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"[FFmpeg] stderr: {result.stderr.decode(errors='ignore')}")
            return False
        return True
    except FileNotFoundError:
        print("[FFmpeg] ffmpeg not found — returning raw file")
        return False
    except Exception as e:
        print(f"[FFmpeg] conversion error: {e}")
        return False


# ============================================
# Transcription via OpenRouter (Whisper)
# ============================================

async def transcribe_audio_openrouter(audio_path: str) -> Dict[str, Any]:
    """
    Transcribe audio using OpenRouter's whisper endpoint.
    
    Uses the project's .env OPENROUTER_API_KEY (settings.OPENROUTER_API_KEY),
    NEVER falls back to system environment variables.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(500, "OPENROUTER_API_KEY not configured in backend/.env")

    print(f"[Transcribe] Using API key from .env: {api_key[:8]}...{api_key[-4:]}")

    # Read the audio file
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    file_size_kb = len(audio_bytes) / 1024
    print(f"[Transcribe] Audio file size: {file_size_kb:.0f} KB")

    # Use OpenRouter chat completions with audio input
    # Encode audio as base64 for the input_audio field
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    # Determine format from file extension
    ext = os.path.splitext(audio_path)[1].lower()
    audio_format = "wav" if ext == ".wav" else "mp3"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://naviya-mock-interview.local",
        "X-Title": "NAVIYA Mock Interview",
    }

    payload = {
        "model": "openai/whisper-large-v3",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_b64,
                            "format": audio_format,
                        },
                    }
                ],
            }
        ],
        "temperature": 0.0,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        print("[Transcribe] Sending audio to OpenRouter (whisper-large-v3)...")
        response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)

        if response.status_code != 200:
            error_text = response.text
            print(f"[Transcribe] OpenRouter error ({response.status_code}): {error_text}")

            # If whisper model fails, fall back to Gemini for audio understanding
            print("[Transcribe] Falling back to Gemini Flash for transcription...")
            return await _transcribe_via_gemini(audio_b64, audio_format, headers)

        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        return {
            "text": text,
            "segments": _text_to_segments(text),
        }


async def _transcribe_via_gemini(
    audio_b64: str, audio_format: str, base_headers: dict
) -> Dict[str, Any]:
    """Fallback: use Gemini Flash to transcribe audio"""
    headers = {
        **base_headers,
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.GEMINI_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Transcribe the following audio recording of a mock interview. "
                            "Label each speaker as either INTERVIEWER or CANDIDATE. "
                            "The first speaker is the INTERVIEWER. "
                            "Format:\nINTERVIEWER: ...\nCANDIDATE: ...\nINTERVIEWER: ...\n"
                            "Transcribe EVERYTHING spoken. Do not summarize."
                        ),
                    },
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_b64,
                            "format": audio_format,
                        },
                    },
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 8000,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)

        if response.status_code != 200:
            error_text = response.text
            print(f"[Transcribe-Gemini] Error ({response.status_code}): {error_text}")
            raise HTTPException(
                502,
                f"Transcription failed. OpenRouter returned {response.status_code}",
            )

        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Parse labeled transcript into segments
        segments = _parse_labeled_transcript(text)
        return {"text": text, "segments": segments}


def _text_to_segments(text: str) -> List[Dict]:
    """Split plain text into rough segments (sentence-level)"""
    import re
    sentences = re.split(r"(?<=[.!?])\s+", text)
    segments = []
    for i, sentence in enumerate(sentences):
        if sentence.strip():
            segments.append({
                "id": i,
                "text": sentence.strip(),
                "speaker": "INTERVIEWER" if i % 2 == 0 else "CANDIDATE",
            })
    return segments


def _parse_labeled_transcript(text: str) -> List[Dict]:
    """Parse INTERVIEWER: ... / CANDIDATE: ... labeled text into segments"""
    import re
    segments = []
    pattern = r"(INTERVIEWER|CANDIDATE)\s*:\s*(.+?)(?=(?:INTERVIEWER|CANDIDATE)\s*:|$)"
    matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)

    for i, (speaker, content) in enumerate(matches):
        segments.append({
            "id": i,
            "speaker": speaker.upper(),
            "text": content.strip(),
        })

    if not segments and text.strip():
        # Fallback: treat as single block
        segments.append({"id": 0, "speaker": "CANDIDATE", "text": text.strip()})

    return segments


# ============================================
# Speaker Diarization (heuristic, no ML)
# ============================================

def diarize_segments(segments: List[Dict]) -> List[Dict]:
    """
    Label segments as INTERVIEWER or CANDIDATE using heuristics.
    First speaker is always INTERVIEWER.
    Questions (ending with ?) are typically INTERVIEWER.
    """
    if not segments:
        return segments

    for i, seg in enumerate(segments):
        if "speaker" in seg and seg["speaker"] in ("INTERVIEWER", "CANDIDATE"):
            continue  # Already labeled

        text = seg.get("text", "")

        if i == 0:
            seg["speaker"] = "INTERVIEWER"
        elif "?" in text and len(text) < 200:
            seg["speaker"] = "INTERVIEWER"
        elif i > 0 and segments[i - 1].get("speaker") == "INTERVIEWER":
            seg["speaker"] = "CANDIDATE"
        elif i > 0 and segments[i - 1].get("speaker") == "CANDIDATE":
            seg["speaker"] = "INTERVIEWER"
        else:
            seg["speaker"] = "CANDIDATE"

    return segments


# ============================================
# Request/Response Models
# ============================================

class TranscriptionResponse(BaseModel):
    success: bool
    text: str
    segments: List[Dict[str, Any]]
    duration_seconds: Optional[float] = None


class EvaluateRequest(BaseModel):
    user_id: str
    transcript_segments: List[Dict[str, Any]]
    session_id: Optional[str] = None


class InterviewSessionResponse(BaseModel):
    success: bool
    session_id: str
    transcript: str
    segments: List[Dict[str, Any]]
    evaluation: Dict[str, Any]


# ============================================
# API Endpoints
# ============================================

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_interview_audio(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    """
    Upload interview audio (webm/mp3/wav) → transcribe via OpenRouter.
    Returns labeled transcript segments.
    """
    if not file.filename:
        raise HTTPException(400, "No audio file provided")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else "webm"
    if ext not in ("webm", "mp3", "wav", "ogg", "m4a"):
        raise HTTPException(400, f"Unsupported audio format: {ext}")

    content = await file.read()
    print(f"[Interview] Received {file.filename} ({len(content)/1024:.0f} KB)")

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Convert to WAV if not already
        audio_path = tmp_path
        if ext not in ("wav", "mp3"):
            wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
            if _convert_webm_to_wav(tmp_path, wav_path):
                audio_path = wav_path
                print(f"[Interview] Converted to WAV ({os.path.getsize(wav_path)/1024:.0f} KB)")

        # Transcribe
        result = await transcribe_audio_openrouter(audio_path)

        # Apply diarization
        segments = diarize_segments(result.get("segments", []))

        return TranscriptionResponse(
            success=True,
            text=result.get("text", ""),
            segments=segments,
        )

    finally:
        # Cleanup temp files
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        wav_candidate = tmp_path.rsplit(".", 1)[0] + ".wav"
        try:
            os.unlink(wav_candidate)
        except OSError:
            pass


@router.post("/evaluate")
async def evaluate_interview_transcript(req: EvaluateRequest):
    """
    Evaluate a transcript (already transcribed) using the InterviewEvaluationAgent.
    """
    if not req.transcript_segments:
        raise HTTPException(400, "No transcript segments provided")

    print(f"[Interview] Evaluating {len(req.transcript_segments)} segments for user {req.user_id}")

    evaluation = await evaluate_interview(
        user_id=req.user_id,
        transcript_segments=req.transcript_segments,
        session_id=req.session_id,
    )

    # Save to Supabase
    try:
        await _save_interview_session(
            user_id=req.user_id,
            session_id=evaluation.session_id,
            transcript_segments=req.transcript_segments,
            evaluation=evaluation.dict(),
        )
    except Exception as e:
        print(f"[Interview] Failed to save session: {e}")

    # Update dashboard state
    try:
        dashboard_service = get_dashboard_state_service()
        await dashboard_service.mark_interview_ready(req.user_id)
    except Exception as e:
        print(f"[Interview] Failed to update dashboard state: {e}")

    return {"success": True, "evaluation": evaluation.dict()}


@router.post("/session", response_model=InterviewSessionResponse)
async def full_interview_session(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    """
    Full pipeline: Upload audio → Transcribe → Evaluate → Save.
    Single endpoint for the complete flow.
    """
    # Step 1: Transcribe
    transcription = await transcribe_interview_audio(file=file, user_id=user_id)

    if not transcription.success or not transcription.segments:
        raise HTTPException(500, "Transcription failed or produced no segments")

    # Step 2: Evaluate
    session_id = str(uuid.uuid4())
    evaluation = await evaluate_interview(
        user_id=user_id,
        transcript_segments=[s if isinstance(s, dict) else s.dict() for s in transcription.segments],
        session_id=session_id,
    )

    # Step 3: Save
    try:
        await _save_interview_session(
            user_id=user_id,
            session_id=session_id,
            transcript_segments=transcription.segments,
            evaluation=evaluation.dict(),
        )
    except Exception as e:
        print(f"[Interview] Failed to save session: {e}")

    # Step 4: Update dashboard state
    try:
        dashboard_service = get_dashboard_state_service()
        await dashboard_service.mark_interview_ready(user_id)
    except Exception as e:
        print(f"[Interview] Failed to update dashboard: {e}")

    return InterviewSessionResponse(
        success=True,
        session_id=session_id,
        transcript=transcription.text,
        segments=transcription.segments if isinstance(transcription.segments, list) else [],
        evaluation=evaluation.dict(),
    )


@router.get("/sessions/{user_id}")
async def get_interview_sessions(user_id: str):
    """Get all past interview sessions for a user"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"{SUPABASE_REST_URL}/interview_sessions?user_id=eq.{user_id}&order=created_at.desc"
        response = await client.get(url, headers=_get_supabase_headers())

        if response.status_code == 200:
            sessions = response.json()
            return {"success": True, "sessions": sessions}

        return {"success": True, "sessions": []}


# ============================================
# Supabase persistence
# ============================================

async def _save_interview_session(
    user_id: str,
    session_id: str,
    transcript_segments: Any,
    evaluation: Dict,
):
    """Save interview session to Supabase"""
    # Convert segments to serializable format
    segments_data = []
    for seg in transcript_segments:
        if isinstance(seg, dict):
            segments_data.append(seg)
        else:
            segments_data.append({"speaker": str(seg.get("speaker", "")), "text": str(seg.get("text", ""))})

    data = {
        "id": session_id,
        "user_id": user_id,
        "transcript_segments": segments_data,
        "evaluation": evaluation,
        "overall_score": evaluation.get("overall_score", 0),
        "overall_rating": evaluation.get("overall_rating", ""),
        "created_at": datetime.utcnow().isoformat(),
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{SUPABASE_REST_URL}/interview_sessions",
            headers=_get_supabase_headers(),
            json=data,
        )
        if response.status_code not in (200, 201):
            print(f"[Interview] Supabase save error: {response.status_code} - {response.text}")
            # Table may not exist yet — that's okay, don't fail the request


# ============================================
# Interview Chat
# ============================================

class InterviewChatRequest(BaseModel):
    message: str
    evaluation: Optional[Dict[str, Any]] = None
    transcript: Optional[str] = ""
    segments: Optional[List[Dict[str, str]]] = []
    history: Optional[List[Dict[str, str]]] = []   # [{role, content}, ...]


@router.post("/chat")
async def interview_chat(req: InterviewChatRequest):
    """Chat with AI about the interview results — ask for improvements, tips, etc."""
    try:
        # Build context from evaluation data
        context_parts = []

        if req.evaluation:
            ev = req.evaluation
            context_parts.append(f"Overall Score: {ev.get('overall_score', 'N/A')}/100")
            context_parts.append(f"Rating: {ev.get('overall_rating', 'N/A')}")
            context_parts.append(f"Communication: {ev.get('communication_score', 'N/A')}/10")
            context_parts.append(f"Technical: {ev.get('technical_score', 'N/A')}/10")
            context_parts.append(f"Confidence: {ev.get('confidence_score', 'N/A')}/10")

            if ev.get("strengths_summary"):
                context_parts.append(f"Strengths: {', '.join(ev['strengths_summary'])}")
            if ev.get("improvement_areas"):
                context_parts.append(f"Areas to Improve: {', '.join(ev['improvement_areas'])}")
            if ev.get("recommendation"):
                context_parts.append(f"Recommendation: {ev['recommendation']}")

            qa_evals = ev.get("qa_evaluations", [])
            if qa_evals:
                context_parts.append("\n--- Question-by-Question ---")
                for i, qa in enumerate(qa_evals, 1):
                    context_parts.append(
                        f"Q{i}: {qa.get('question', '')}\n"
                        f"  Candidate Answer: {qa.get('candidate_answer', '(none)')}\n"
                        f"  Score: {qa.get('quality_score', '?')}/10\n"
                        f"  Ideal Answer: {qa.get('ideal_answer_summary', '')}\n"
                        f"  Feedback: {qa.get('feedback', '')}"
                    )

        if req.segments:
            context_parts.append("\n--- Transcript ---")
            for seg in req.segments:
                context_parts.append(f"{seg.get('speaker', '???')}: {seg.get('text', '')}")
        elif req.transcript:
            context_parts.append(f"\n--- Transcript ---\n{req.transcript}")

        interview_context = "\n".join(context_parts) if context_parts else "No interview data available yet."

        system_prompt = (
            "You are an expert interview coach and career mentor embedded in the NAVIYA platform. "
            "The user just completed a mock interview and you have full access to their evaluation results, "
            "scores, transcript, and per-question feedback below.\n\n"
            "Your role:\n"
            "- Answer questions about their interview performance\n"
            "- Suggest specific improvements with concrete examples\n"
            "- Provide better answer templates when asked\n"
            "- Give tips on communication, confidence, body language, and technical depth\n"
            "- Be encouraging but honest — highlight both strengths and weaknesses\n"
            "- Keep responses concise (2-4 paragraphs max) and actionable\n\n"
            f"=== INTERVIEW DATA ===\n{interview_context}\n=== END ==="
        )

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        for msg in (req.history or []):
            if msg.get("role") in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user message
        messages.append({"role": "user", "content": req.message})

        # Call OpenRouter
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "NAVIYA Interview Coach",
                },
                json={
                    "model": "google/gemini-2.0-flash-001",
                    "messages": messages,
                    "max_tokens": 1024,
                    "temperature": 0.7,
                },
            )

            if response.status_code != 200:
                error_text = response.text[:300]
                print(f"[InterviewChat] OpenRouter error {response.status_code}: {error_text}")
                raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

            data = response.json()
            reply = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "I'm sorry, I couldn't generate a response. Please try again.")
            )

            return {"success": True, "reply": reply}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[InterviewChat] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
