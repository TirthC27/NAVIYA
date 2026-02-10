"""
AI Agent — sends resume text to OpenRouter (Gemma model) and parses the response.
Includes retry logic for incomplete/rate-limited responses.
"""
import json
import re
import time
import requests
from config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, MODEL_NAME, SYSTEM_PROMPT

MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds between retries

# OPIK self-evaluation regex (matches the block appended by the LLM)
_OPIK_EVAL_RE = re.compile(
    r"\[OPIK_EVALUATION\](.*?)\[/OPIK_EVALUATION\]",
    re.DOTALL | re.IGNORECASE,
)

# Compact self-evaluation instruction appended to the system prompt
_OPIK_EVAL_SUFFIX = """

--- IMPORTANT: POST-TASK SELF EVALUATION ---

After outputting the JSON above, you MUST append a compact self-evaluation block.
This is shown to the user as an AI-performance popup — keep it short and non-technical.

FORMAT (use EXACTLY these tags):

[OPIK_EVALUATION]

Task Quality: {High | Medium | Needs Improvement}

Key Strengths:
- {1 short insight}
- {1 short insight}

Confidence Level:
- {Low | Medium | High}
(Reason: 1 line max)

Alignment With Resume:
- {Well Aligned | Partially Aligned | Misaligned}

Improvement Suggestion:
- {One actionable improvement}

Execution Metrics:
- Response Clarity: {1-5}
- Personalization Score: {1-5}
- Relevance Score: {1-5}

[/OPIK_EVALUATION]

RULES: Max 6 bullets. No jargon. Speak like a mentor.
--- END EVALUATION INSTRUCTIONS ---
"""


def _parse_opik_eval_block(text: str) -> dict:
    """Parse the [OPIK_EVALUATION] block into a structured dict."""
    result = {}
    m = re.search(r"Task Quality:\s*(High|Medium|Needs Improvement)", text, re.I)
    if m:
        result["task_quality"] = m.group(1).strip()
    strengths = []
    s_block = re.search(r"Key Strengths:\s*\n((?:\s*-\s*.+\n?)+)", text, re.I)
    if s_block:
        for line in s_block.group(1).strip().splitlines():
            line = re.sub(r"^\s*-\s*", "", line).strip()
            if line:
                strengths.append(line)
    result["strengths"] = strengths
    m = re.search(r"Confidence Level:\s*\n?\s*-?\s*(Low|Medium|High)", text, re.I)
    if m:
        result["confidence"] = m.group(1).strip()
    m_reason = re.search(r"\(Reason:\s*(.+?)\)", text, re.I)
    if m_reason:
        result["confidence_reason"] = m_reason.group(1).strip()
    m = re.search(r"Alignment With Resume:\s*\n?\s*-?\s*(Well Aligned|Partially Aligned|Misaligned)", text, re.I)
    if m:
        result["alignment"] = m.group(1).strip()
    m = re.search(r"Improvement Suggestion:\s*\n?\s*-\s*(.+)", text, re.I)
    if m:
        result["improvement"] = m.group(1).strip()
    metrics = {}
    for label in ("Response Clarity", "Personalization Score", "Relevance Score"):
        m = re.search(rf"{label}:\s*(\d)", text, re.I)
        if m:
            metrics[label.lower().replace(" ", "_")] = int(m.group(1))
    if metrics:
        result["metrics"] = metrics
    return result


def call_gemma(resume_text: str) -> dict:
    """
    Send the extracted resume text to the Gemma model via OpenRouter
    and return the structured JSON response. Retries on incomplete responses.
    """
    if not OPENROUTER_API_KEY:
        raise EnvironmentError(
            "OPENROUTER_API_KEY is not set. "
            "Create a .env file with your key or set it as an environment variable.\n"
            "Get your free key at: https://openrouter.ai/keys"
        )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://resume-ai-agent-parser.local",
        "X-Title": "Resume AI Agent Parser",
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + _OPIK_EVAL_SUFFIX},
            {
                "role": "user",
                "content": (
                    "Parse the following resume and extract ALL information "
                    "into the structured JSON format described.\n\n"
                    f"RESUME TEXT:\n\n{resume_text}"
                ),
            },
        ],
        "temperature": 0.1,
        "max_tokens": 8000,
    }

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"  → Sending resume to {MODEL_NAME} via OpenRouter … (attempt {attempt}/{MAX_RETRIES})")

        try:
            response = requests.post(
                OPENROUTER_BASE_URL, headers=headers, json=payload, timeout=120
            )
        except requests.exceptions.Timeout:
            print(f"  ⚠ Request timed out.")
            last_error = "Request timed out"
            _wait_before_retry(attempt)
            continue
        except requests.exceptions.ConnectionError as e:
            print(f"  ⚠ Connection error: {e}")
            last_error = str(e)
            _wait_before_retry(attempt)
            continue

        # Handle HTTP errors with retry for rate limits
        if response.status_code == 429:
            print(f"  ⚠ Rate limited (429). Waiting before retry …")
            last_error = "Rate limited"
            _wait_before_retry(attempt, delay=10)
            continue

        if response.status_code != 200:
            error_detail = response.text
            raise RuntimeError(
                f"OpenRouter API error (HTTP {response.status_code}):\n{error_detail}"
            )

        result = response.json()

        # Check for provider errors inside the response
        if "error" in result:
            error_msg = result["error"].get("message", str(result["error"]))
            print(f"  ⚠ API error: {error_msg}")
            last_error = error_msg
            _wait_before_retry(attempt)
            continue

        # Extract the assistant message content
        try:
            content = result["choices"][0]["message"]["content"]
            finish_reason = result["choices"][0].get("finish_reason")
        except (KeyError, IndexError) as e:
            print(f"  ⚠ Unexpected response structure: {e}")
            last_error = str(e)
            _wait_before_retry(attempt)
            continue

        # Check if response is too short (incomplete generation)
        if len(content.strip()) < 100:
            print(f"  ⚠ Response too short ({len(content.strip())} chars) — likely incomplete. Retrying …")
            last_error = f"Incomplete response ({len(content.strip())} chars)"
            _wait_before_retry(attempt)
            continue

        if finish_reason == "length":
            print("  ⚠ Response was truncated (hit token limit).")

        # ── Extract OPIK self-evaluation block (if present) before JSON parsing ──
        opik_eval = {}
        eval_match = _OPIK_EVAL_RE.search(content)
        if eval_match:
            opik_eval = _parse_opik_eval_block(eval_match.group(1))
            # Strip the eval block so _extract_json sees clean JSON
            content = content[:eval_match.start()] + content[eval_match.end():]

        # Try to parse JSON
        parsed = _extract_json(content)

        # Check if parsing actually succeeded
        if "parse_error" not in parsed:
            parsed["_opik_eval"] = opik_eval
            return parsed

        # JSON parsing failed — retry
        print(f"  ⚠ Failed to parse response as JSON. Retrying …")
        last_error = parsed.get("parse_error", "Unknown parse error")
        _wait_before_retry(attempt)

    # All retries exhausted
    raise RuntimeError(
        f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}\n"
        "This is usually caused by free-tier rate limits on OpenRouter.\n"
        "Try again in a minute, or consider using a paid model."
    )


def _wait_before_retry(attempt: int, delay: int = RETRY_DELAY):
    """Wait between retries with increasing delay."""
    if attempt < MAX_RETRIES:
        wait = delay * attempt
        print(f"  ⏳ Waiting {wait}s before retry …")
        time.sleep(wait)


def _extract_json(text: str) -> dict:
    """
    Robustly extract JSON from the model response.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    cleaned = text.strip()

    # Remove markdown code fences if present
    if cleaned.startswith("```"):
        try:
            first_newline = cleaned.index("\n")
            cleaned = cleaned[first_newline + 1:]
        except ValueError:
            pass
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Try to find JSON object boundaries
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start:end])
            except json.JSONDecodeError:
                pass

        return {
            "raw_response": text[:500],
            "parse_error": f"Could not parse model output as JSON: {e}",
        }
