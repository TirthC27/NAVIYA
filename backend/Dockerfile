# ============================================
# NAVIYA Backend — Production Dockerfile (OPTIMIZED)
# Target: Railway (Linux container)
# Runtime: FastAPI + Uvicorn
# Build time: 10-15 minutes (down from 60-90 min)
# ============================================

FROM python:3.11-slim AS base

# ── Unbuffered logs + no .pyc files ──────────────────────────
# REMOVED PIP_NO_CACHE_DIR → Enables Docker layer caching (huge speedup!)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_PREFER_BINARY=1

# ── System dependencies ─────────────────────────────────────
# libmagic1        → python-magic (file type detection)
# tesseract-ocr    → pytesseract (OCR for documents)
# libgl1           → OpenCV / Pillow headless rendering
# build-essential  → compile native C extensions (chromadb, etc.)
# libffi-dev       → cffi / cryptography
# libpq-dev        → psycopg2 if needed downstream
# curl             → healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    libpq-dev \
    libmagic1 \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ────────────────────────────────────────
WORKDIR /app

# ── Install base dependencies FIRST (cached layer, fast install) ────
# These change rarely and install quickly → excellent Docker cache hit rate
COPY requirements-base.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements-base.txt

# ── Install ML dependencies SECOND (cached layer, heavy install) ────
# These are huge but cached separately → only rebuild if ML deps change
# CPU-only PyTorch saves 2-3GB and 10+ minutes vs CUDA version
COPY requirements-ml.txt .
RUN pip install -r requirements-ml.txt

# ── Copy application source ─────────────────────────────────
COPY app/ ./app/
COPY Agents/ ./Agents/
COPY data/ ./data/

# ── Expose port (Railway injects $PORT at runtime) ──────────
EXPOSE ${PORT:-8000}

# ── Healthcheck ──────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/docs || exit 1

# ── Entrypoint ───────────────────────────────────────────────
# Railway provides $PORT; default to 8000 for local dev.
# Workers set to 1: agents hold in-memory state and use
# background tasks — multiple workers cause state divergence.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
