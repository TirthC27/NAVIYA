"""
LearnTube AI - PII Guard and Safety Module
Detects and blocks unsafe content, PII leakage, and compliance violations

Features:
- Email detection
- Phone number detection
- Wallet/crypto phrase detection
- Unsafe learning query detection
- Cheating request detection
- Safety metrics logging to OPIK

All safety checks are logged for tradeoff analysis:
- safety_block_rate
- false_alarm_rate
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum

from app.observability.opik_client import (
    log_metric,
    log_feedback,
    start_trace,
    end_trace,
    create_span_async
)


# ============================================
# Enums and Data Classes
# ============================================
class SafetyCategory(Enum):
    """Categories of safety violations"""
    CLEAN = "clean"
    PII_EMAIL = "pii_email"
    PII_PHONE = "pii_phone"
    PII_ADDRESS = "pii_address"
    CRYPTO_WALLET = "crypto_wallet"
    CHEATING = "cheating"
    UNSAFE_CONTENT = "unsafe_content"
    HARMFUL = "harmful"
    ILLEGAL = "illegal"


@dataclass
class SafetyCheckResult:
    """Result of a safety check"""
    is_safe: bool
    category: SafetyCategory
    confidence: float  # 0-1
    detected_items: List[str] = field(default_factory=list)
    reason: str = ""
    should_block: bool = False
    suggested_response: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "is_safe": self.is_safe,
            "category": self.category.value,
            "confidence": self.confidence,
            "detected_items": self.detected_items,
            "reason": self.reason,
            "should_block": self.should_block,
            "suggested_response": self.suggested_response
        }


# ============================================
# Global Metrics Storage
# ============================================
_safety_metrics = {
    "total_checks": 0,
    "blocks": 0,
    "pii_detections": 0,
    "unsafe_detections": 0,
    "cheating_detections": 0,
    "false_positives_reported": 0,
    "timestamps": []
}


# ============================================
# PII Detection Patterns
# ============================================
# Email pattern
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

# Phone patterns (various formats)
PHONE_PATTERNS = [
    re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'),  # US: 123-456-7890
    re.compile(r'\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b'),  # US: (123) 456-7890
    re.compile(r'\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b'),  # International
    re.compile(r'\b\d{10,14}\b'),  # Plain 10+ digit numbers
]

# Crypto wallet patterns
CRYPTO_PATTERNS = [
    re.compile(r'\b0x[a-fA-F0-9]{40}\b'),  # Ethereum
    re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),  # Bitcoin
    re.compile(r'\bbc1[a-zA-HJ-NP-Z0-9]{39,59}\b'),  # Bitcoin Bech32
]

# BIP39 seed phrase indicators (12 or 24 words)
SEED_PHRASE_WORDS = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
    'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
    'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album'
    # ... truncated for brevity, but you'd want the full BIP39 list
]

# SSN pattern
SSN_PATTERN = re.compile(r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b')


# ============================================
# Unsafe Content Keywords
# ============================================
CHEATING_KEYWORDS = [
    # Academic cheating
    "write my essay", "do my homework", "answer my exam", "cheat on test",
    "exam answers", "homework answers", "assignment for me", "write my paper",
    "plagiarize", "copy paste essay", "buy essay", "essay mill",
    "exam leak", "test leak", "answer key",
    
    # Certification cheating
    "certification dump", "exam dump", "cheat certification",
    "pass without studying", "fake certificate", "buy diploma",
]

UNSAFE_LEARNING_KEYWORDS = [
    # Harmful activities
    "how to hack", "hacking tutorial", "steal password", "crack software",
    "illegal download", "pirate", "bypass security", "exploit vulnerability",
    
    # Weapons/violence
    "make weapon", "build bomb", "create explosive", "harm someone",
    
    # Drugs
    "make drugs", "synthesize", "drug recipe",
    
    # Fraud
    "scam people", "fraud tutorial", "fake identity", "identity theft",
    
    # Explicit
    "adult content", "nsfw", "explicit",
]

HARMFUL_KEYWORDS = [
    "self harm", "suicide", "hurt myself", "end my life",
    "harm others", "kill", "murder", "attack people",
]


# ============================================
# Core Detection Functions
# ============================================
def detect_pii(text: str) -> SafetyCheckResult:
    """
    Detect PII (Personally Identifiable Information) in text.
    
    Checks for:
    - Email addresses
    - Phone numbers
    - Crypto wallet addresses
    - Seed phrases
    - SSN patterns
    """
    detected_items = []
    categories_found = []
    
    # Check emails
    emails = EMAIL_PATTERN.findall(text)
    if emails:
        detected_items.extend([f"email: {e}" for e in emails])
        categories_found.append(SafetyCategory.PII_EMAIL)
    
    # Check phone numbers
    for pattern in PHONE_PATTERNS:
        phones = pattern.findall(text)
        if phones:
            detected_items.extend([f"phone: {p}" for p in phones])
            categories_found.append(SafetyCategory.PII_PHONE)
            break
    
    # Check crypto wallets
    for pattern in CRYPTO_PATTERNS:
        wallets = pattern.findall(text)
        if wallets:
            detected_items.extend([f"wallet: {w[:8]}...{w[-4:]}" for w in wallets])
            categories_found.append(SafetyCategory.CRYPTO_WALLET)
    
    # Check for seed phrase patterns (multiple BIP39 words in sequence)
    text_lower = text.lower()
    words = text_lower.split()
    seed_word_count = sum(1 for w in words if w in SEED_PHRASE_WORDS)
    if seed_word_count >= 6:  # Suspicious if 6+ seed words
        detected_items.append(f"potential_seed_phrase: {seed_word_count} BIP39 words detected")
        categories_found.append(SafetyCategory.CRYPTO_WALLET)
    
    # Check SSN
    ssns = SSN_PATTERN.findall(text)
    if ssns:
        detected_items.extend([f"ssn_pattern: ***-**-{s[-4:]}" for s in ssns])
        categories_found.append(SafetyCategory.PII_ADDRESS)
    
    if detected_items:
        primary_category = categories_found[0] if categories_found else SafetyCategory.CLEAN
        return SafetyCheckResult(
            is_safe=False,
            category=primary_category,
            confidence=0.95,
            detected_items=detected_items,
            reason=f"PII detected: {len(detected_items)} item(s) found",
            should_block=True,
            suggested_response="Your request contains personal information. Please remove any emails, phone numbers, or sensitive data and try again."
        )
    
    return SafetyCheckResult(
        is_safe=True,
        category=SafetyCategory.CLEAN,
        confidence=1.0,
        reason="No PII detected"
    )


def detect_unsafe_queries(text: str) -> SafetyCheckResult:
    """
    Detect unsafe or inappropriate learning queries.
    
    Checks for:
    - Cheating requests
    - Harmful content requests
    - Illegal activity queries
    """
    text_lower = text.lower()
    detected_items = []
    categories_found = []
    
    # Check for cheating keywords
    for keyword in CHEATING_KEYWORDS:
        if keyword in text_lower:
            detected_items.append(f"cheating: '{keyword}'")
            categories_found.append(SafetyCategory.CHEATING)
    
    # Check for unsafe learning keywords
    for keyword in UNSAFE_LEARNING_KEYWORDS:
        if keyword in text_lower:
            detected_items.append(f"unsafe: '{keyword}'")
            categories_found.append(SafetyCategory.UNSAFE_CONTENT)
    
    # Check for harmful keywords
    for keyword in HARMFUL_KEYWORDS:
        if keyword in text_lower:
            detected_items.append(f"harmful: '{keyword}'")
            categories_found.append(SafetyCategory.HARMFUL)
    
    if detected_items:
        primary_category = categories_found[0] if categories_found else SafetyCategory.UNSAFE_CONTENT
        
        suggested_responses = {
            SafetyCategory.CHEATING: "I can't help with cheating or academic dishonesty. Let me suggest legitimate learning resources instead!",
            SafetyCategory.UNSAFE_CONTENT: "I can't provide learning resources for potentially harmful activities. Please try a different topic.",
            SafetyCategory.HARMFUL: "I'm concerned about this request. If you're struggling, please reach out to appropriate support services.",
            SafetyCategory.ILLEGAL: "I can't assist with learning about illegal activities."
        }
        
        return SafetyCheckResult(
            is_safe=False,
            category=primary_category,
            confidence=0.9,
            detected_items=detected_items,
            reason=f"Unsafe content detected: {len(detected_items)} concern(s)",
            should_block=True,
            suggested_response=suggested_responses.get(
                primary_category,
                "I can't process this request due to safety concerns."
            )
        )
    
    return SafetyCheckResult(
        is_safe=True,
        category=SafetyCategory.CLEAN,
        confidence=1.0,
        reason="No unsafe content detected"
    )


# ============================================
# Main Safety Check Function
# ============================================
async def check_content_safety(
    text: str,
    check_pii: bool = True,
    check_unsafe: bool = True,
    trace_id: Optional[str] = None
) -> SafetyCheckResult:
    """
    Comprehensive safety check for user input.
    
    Args:
        text: The text to check
        check_pii: Whether to check for PII
        check_unsafe: Whether to check for unsafe content
        trace_id: OPIK trace ID for logging
        
    Returns:
        SafetyCheckResult with all findings
    """
    global _safety_metrics
    _safety_metrics["total_checks"] += 1
    _safety_metrics["timestamps"].append(datetime.utcnow().isoformat())
    
    # Keep only last 1000 timestamps
    if len(_safety_metrics["timestamps"]) > 1000:
        _safety_metrics["timestamps"] = _safety_metrics["timestamps"][-1000:]
    
    all_detected = []
    categories = []
    should_block = False
    
    async with create_span_async(
        trace_id,
        "SafetyCheck",
        span_type="guard",
        input_data={"text_length": len(text), "check_pii": check_pii, "check_unsafe": check_unsafe}
    ) as span:
        # Check PII
        if check_pii:
            pii_result = detect_pii(text)
            if not pii_result.is_safe:
                all_detected.extend(pii_result.detected_items)
                categories.append(pii_result.category)
                should_block = True
                _safety_metrics["pii_detections"] += 1
        
        # Check unsafe content
        if check_unsafe:
            unsafe_result = detect_unsafe_queries(text)
            if not unsafe_result.is_safe:
                all_detected.extend(unsafe_result.detected_items)
                categories.append(unsafe_result.category)
                should_block = True
                if unsafe_result.category == SafetyCategory.CHEATING:
                    _safety_metrics["cheating_detections"] += 1
                else:
                    _safety_metrics["unsafe_detections"] += 1
        
        if should_block:
            _safety_metrics["blocks"] += 1
        
        # Create result
        if all_detected:
            primary_category = categories[0] if categories else SafetyCategory.UNSAFE_CONTENT
            result = SafetyCheckResult(
                is_safe=False,
                category=primary_category,
                confidence=0.9,
                detected_items=all_detected,
                reason=f"Safety check failed: {len(all_detected)} issue(s) detected",
                should_block=True,
                suggested_response=_get_safe_response(primary_category)
            )
        else:
            result = SafetyCheckResult(
                is_safe=True,
                category=SafetyCategory.CLEAN,
                confidence=1.0,
                reason="All safety checks passed"
            )
        
        # Log to OPIK
        span.set_output({
            "is_safe": result.is_safe,
            "category": result.category.value,
            "items_detected": len(all_detected)
        })
        span.log_metric("safety_passed", 1.0 if result.is_safe else 0.0)
        
        if trace_id:
            log_feedback(
                trace_id,
                "safety_check",
                1.0 if result.is_safe else 0.0,
                result.reason,
                "safety-guard"
            )
    
    return result


def _get_safe_response(category: SafetyCategory) -> str:
    """Get appropriate safe response based on category"""
    responses = {
        SafetyCategory.PII_EMAIL: "Please remove email addresses from your request.",
        SafetyCategory.PII_PHONE: "Please remove phone numbers from your request.",
        SafetyCategory.PII_ADDRESS: "Please remove personal identification numbers from your request.",
        SafetyCategory.CRYPTO_WALLET: "Please remove wallet addresses or seed phrases from your request.",
        SafetyCategory.CHEATING: "I can't help with cheating. Let me suggest legitimate learning resources instead!",
        SafetyCategory.UNSAFE_CONTENT: "I can't provide learning resources for potentially harmful activities.",
        SafetyCategory.HARMFUL: "I'm concerned about this request. Please reach out to appropriate support if needed.",
        SafetyCategory.ILLEGAL: "I can't assist with illegal activities."
    }
    return responses.get(category, "I can't process this request due to safety concerns.")


# ============================================
# Topic Safety Check
# ============================================
async def is_safe_topic(
    topic: str,
    trace_id: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Quick check if a learning topic is safe.
    
    Returns:
        Tuple of (is_safe, error_message)
    """
    result = await check_content_safety(topic, check_pii=True, check_unsafe=True, trace_id=trace_id)
    
    if result.is_safe:
        return True, None
    else:
        return False, result.suggested_response


# ============================================
# Metrics Functions
# ============================================
def get_safety_metrics() -> Dict[str, Any]:
    """
    Get current safety metrics for dashboard display.
    
    Returns metrics including:
    - safety_block_rate
    - false_alarm_rate (based on reported false positives)
    """
    total = _safety_metrics["total_checks"]
    blocks = _safety_metrics["blocks"]
    false_positives = _safety_metrics["false_positives_reported"]
    
    return {
        "total_checks": total,
        "total_blocks": blocks,
        "safety_block_rate": blocks / total if total > 0 else 0,
        "false_alarm_rate": false_positives / blocks if blocks > 0 else 0,
        "pii_detections": _safety_metrics["pii_detections"],
        "unsafe_detections": _safety_metrics["unsafe_detections"],
        "cheating_detections": _safety_metrics["cheating_detections"],
        "last_check": _safety_metrics["timestamps"][-1] if _safety_metrics["timestamps"] else None
    }


def report_false_positive(category: str):
    """Report a false positive for metrics tracking"""
    global _safety_metrics
    _safety_metrics["false_positives_reported"] += 1


def reset_safety_metrics():
    """Reset safety metrics (for testing)"""
    global _safety_metrics
    _safety_metrics = {
        "total_checks": 0,
        "blocks": 0,
        "pii_detections": 0,
        "unsafe_detections": 0,
        "cheating_detections": 0,
        "false_positives_reported": 0,
        "timestamps": []
    }


# ============================================
# Safety Guard Class
# ============================================
class SafetyGuard:
    """
    High-level safety guard for the application.
    
    Usage:
        guard = SafetyGuard()
        is_safe, message = await guard.check_topic("python programming")
        if not is_safe:
            return {"error": message}
    """
    
    def __init__(self, strict_mode: bool = True):
        self.strict_mode = strict_mode
    
    async def check_topic(
        self,
        topic: str,
        trace_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """Check if a learning topic is safe"""
        return await is_safe_topic(topic, trace_id)
    
    async def check_full(
        self,
        text: str,
        trace_id: Optional[str] = None
    ) -> SafetyCheckResult:
        """Run full safety check"""
        return await check_content_safety(
            text,
            check_pii=True,
            check_unsafe=True,
            trace_id=trace_id
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get safety metrics"""
        return get_safety_metrics()
    
    @staticmethod
    def report_false_positive(category: str):
        """Report a false positive"""
        report_false_positive(category)


# ============================================
# Middleware for FastAPI
# ============================================
async def safety_middleware(topic: str, trace_id: Optional[str] = None) -> Optional[Dict]:
    """
    Middleware function to check safety before processing.
    
    Returns None if safe, or error dict if blocked.
    """
    guard = SafetyGuard()
    is_safe, message = await guard.check_topic(topic, trace_id)
    
    if not is_safe:
        return {
            "success": False,
            "error": "safety_block",
            "message": message,
            "blocked": True
        }
    
    return None
