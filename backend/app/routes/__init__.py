"""
LearnTube AI - Routes Package
FastAPI route modules for the API
"""

from app.routes.plans import router as plans_router
from app.routes.metrics import router as metrics_router

__all__ = ["plans_router", "metrics_router"]
