"""Liveness / readiness endpoints (no auth)."""

from __future__ import annotations

from fastapi import APIRouter

from .. import __version__
from ..config import settings
from ..engine import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok" if engine.ready else "loading",
        "ready": engine.ready,
        "model": settings.model,
        "device": engine.device,
        "error": engine.error,
        "version": __version__,
    }


@router.get("/")
def root() -> dict:
    return {
        "name": "Spireflow API",
        "description": "OpenAI-compatible speech-to-text powered by Phonon-2.",
        "version": __version__,
        "ready": engine.ready,
        "endpoints": [
            "POST /v1/audio/transcriptions",
            "POST /v1/audio/translations",
            "GET  /v1/models",
            "GET  /v1/usage",
            "GET  /health",
        ],
        "docs": "/docs",
    }
