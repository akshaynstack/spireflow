"""Speech-to-text engine wrapper.

Loads Phonon-2.5 once (via the `fermion-research` package) and exposes a
thread-safe `transcribe()` that returns rich, timestamped output suitable for
OpenAI's `verbose_json`, `srt` and `vtt` formats.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from .config import settings
from .errors import OpenAIError

#: Formats libsndfile reads directly. Everything else is transcoded with ffmpeg.
_NATIVE_EXT = {".wav", ".flac", ".ogg", ".aiff", ".aif"}

#: Phonon-2.5 accepts at most 25 hotwords per call.
_MAX_HOTWORDS = 25


@dataclass
class Segment:
    id: int
    start: float
    end: float
    text: str


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class TranscriptResult:
    text: str
    duration: float
    model: str
    language: str | None = None
    segments: list[Segment] = field(default_factory=list)
    words: list[Word] = field(default_factory=list)
    decode_seconds: float = 0.0
    timed: bool = False


class Engine:
    def __init__(self, model_id: str) -> None:
        self.model_id = model_id
        self.ready = False
        self.error: str | None = None
        self.device: str | None = None
        self._speech = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ load
    def load(self) -> None:
        """Load the model into memory. Runs once at startup; can take 10-120s."""
        try:
            import fermion

            speech = fermion.load_speech(self.model_id)
            self._speech = speech
            self.ready = True
            self.error = None

            info: dict = {}
            try:
                info = speech.describe() or {}
            except Exception:  # noqa: BLE001 - describe() is best-effort
                info = {}
            engine = str(info.get("engine") or "cpu").upper()
            threads = info.get("threads")
            self.device = f"{engine} \u00b7 {threads} threads" if threads else engine
            print(
                f"[spireflow-api] model '{self.model_id}' loaded on {self.device}",
                flush=True,
            )
        except Exception as exc:  # noqa: BLE001
            self._speech = None
            self.ready = False
            self.error = f"{type(exc).__name__}: {exc}"
            print(f"[spireflow-api] model load failed: {self.error}", flush=True)

    # --------------------------------------------------------------- audio io
    def _prepare(self, path: str) -> tuple[str, "callable"]:
        """Return a path libsndfile can read, plus a cleanup callback."""
        ext = Path(path).suffix.lower()
        if ext in _NATIVE_EXT:
            return path, (lambda: None)

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise OpenAIError(
                f"The server cannot decode '{ext or 'this'}' files because ffmpeg "
                "is not installed.",
                400,
                code="unsupported_file",
                param="file",
            )

        out = tempfile.mkstemp(suffix=".wav")[1]
        try:
            subprocess.run(
                [
                    ffmpeg, "-y", "-i", path, "-vn",
                    "-ac", "1", "-ar", "16000", "-f", "wav", out,
                ],
                check=True,
                capture_output=True,
                timeout=600,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            _safe_unlink(out)
            detail = getattr(exc, "stderr", b"") or b""
            message = detail.decode("utf-8", "ignore").strip().splitlines()
            raise OpenAIError(
                "Could not decode the uploaded audio file."
                + (f" ({message[-1]})" if message else ""),
                400,
                code="invalid_file",
                param="file",
            ) from exc

        return out, (lambda: _safe_unlink(out))

    # ------------------------------------------------------------- transcribe
    def transcribe(self, path: str, hotwords: list[str] | None = None) -> TranscriptResult:
        """Transcribe a file. Serialised: the engine is not re-entrant."""
        if not self.ready or self._speech is None:
            raise OpenAIError(
                self.error or "The speech model is not ready yet.",
                503,
                type="server_error",
                code="model_not_ready",
            )

        words = [w.strip() for w in (hotwords or []) if w and w.strip()][:_MAX_HOTWORDS]
        prepared, cleanup = self._prepare(path)
        started = time.perf_counter()
        try:
            with self._lock:
                detail = self._transcribe_detailed(prepared, words)
            decode_seconds = time.perf_counter() - started
            return self._to_result(detail, decode_seconds)
        finally:
            cleanup()

    def _transcribe_detailed(self, path: str, hotwords: list[str]) -> object:
        speech = self._speech
        try:
            return speech.transcribe_detailed(path, hotwords=hotwords or None)
        except (AttributeError, TypeError):
            # Fallback for engines without timestamped output.
            return speech.transcribe(path, hotwords=hotwords or None)

    @staticmethod
    def _to_result(detail: object, decode_seconds: float) -> TranscriptResult:
        # Fallback shape from the plain `transcribe()`: (text, decode_s, audio_s).
        if isinstance(detail, tuple):
            text = str(detail[0]) if len(detail) > 0 else ""
            audio_s = float(detail[2]) if len(detail) > 2 and detail[2] else 0.0
            return TranscriptResult(
                text=(text or "").strip(),
                duration=audio_s,
                model=settings.model,
                decode_seconds=decode_seconds,
            )

        text = str(getattr(detail, "text", "") or "").strip()
        duration = float(getattr(detail, "audio_seconds", 0) or 0.0)
        raw_segments = getattr(detail, "segments", None) or []
        segments = [
            Segment(
                id=index + 1,
                start=float(item.get("start", 0.0)),
                end=float(item.get("end", 0.0)),
                text=str(item.get("text", "")),
            )
            for index, item in enumerate(raw_segments)
        ]
        raw_words = getattr(detail, "words", None) or []
        words = [
            Word(
                text=str(item.get("text", "")),
                start=float(item.get("start", 0.0)),
                end=float(item.get("end", 0.0)),
            )
            for item in raw_words
        ]
        return TranscriptResult(
            text=text,
            duration=duration,
            model=settings.model,
            segments=segments,
            words=words,
            decode_seconds=decode_seconds,
            timed=bool(getattr(detail, "timed", False)),
        )


def _safe_unlink(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


#: The process-wide engine instance.
engine = Engine(settings.model)
