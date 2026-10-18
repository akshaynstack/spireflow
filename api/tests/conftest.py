"""Test configuration: point the app at a throwaway DB and skip model loading.

Environment variables are set *before* `app.config` is imported (pytest imports
conftest.py first), so the Settings singleton picks them up.
"""

from __future__ import annotations

import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="spireflow-api-test-")
os.environ["SPIREFLOW_DB"] = os.path.join(_TMP, "test.db")
os.environ["SPIREFLOW_REQUIRE_AUTH"] = "false"
os.environ["SPIREFLOW_LOAD_MODEL"] = "false"
os.environ["SPIREFLOW_LOG_REQUESTS"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture
def client(monkeypatch):
    """A TestClient with a stubbed, always-ready transcription engine."""
    from app.engine import Segment, TranscriptResult, Word, engine

    def fake_transcribe(_path, hotwords=None):  # noqa: ARG001
        return TranscriptResult(
            text="hello world",
            duration=2.0,
            model="phonon-2",
            segments=[Segment(id=1, start=0.0, end=2.0, text="hello world")],
            words=[Word(text="hello", start=0.0, end=1.0), Word(text="world", start=1.0, end=2.0)],
            decode_seconds=0.05,
            timed=True,
        )

    monkeypatch.setattr(engine, "transcribe", fake_transcribe)
    monkeypatch.setattr(engine, "ready", True)

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def audio_bytes() -> bytes:
    # A tiny RIFF/WAVE header is enough; the engine is stubbed out.
    return b"RIFF....WAVEfmt "
