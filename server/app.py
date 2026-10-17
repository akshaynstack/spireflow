"""Spireflow speech sidecar.

Loads Phonon-2 (via the `fermion-research` package) once, then exposes a tiny
local HTTP API that the Electron app calls:

    GET  /health           -> model + device readiness
    POST /transcribe_path  -> {"path": "C:/audio/clip.wav"}
    POST /transcribe       -> multipart file upload

Only Phonon-2 is used here. See https://www.fermionresearch.com/models/phonon-2/
"""

from __future__ import annotations

import os
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path


def _ensure_streams() -> None:
    """Frozen as a windowed (no-console) executable, `sys.stdout`/`stderr` are
    None. Point them at a log file (or devnull) so `print()` and uvicorn's
    logging can never crash the process and no terminal window is shown."""
    if sys.stdout is not None and sys.stderr is not None:
        return
    stream = None
    target = os.environ.get("SPIREFLOW_LOG")
    if target:
        try:
            Path(target).parent.mkdir(parents=True, exist_ok=True)
            stream = open(target, "a", encoding="utf-8", buffering=1)
        except OSError:
            stream = None
    if stream is None:
        stream = open(os.devnull, "w", encoding="utf-8")
    if sys.stdout is None:
        sys.stdout = stream
    if sys.stderr is None:
        sys.stderr = stream


_ensure_streams()

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_ID = os.environ.get("SPIREFLOW_MODEL", "phonon-2")
PORT = int(os.environ.get("SPIREFLOW_PORT", "8756"))

state: dict = {"ready": False, "error": None, "speech": None, "device": None}


def load_model() -> None:
    """Load Phonon-2 into memory. Runs once at startup; can take 10-40s."""
    try:
        import fermion

        speech = fermion.load_speech(MODEL_ID)
        state["speech"] = speech
        state["ready"] = True
        state["error"] = None

        info = {}
        try:
            info = speech.describe() or {}
        except Exception:  # noqa: BLE001
            info = {}

        engine = (info.get("engine") or "cpu").upper()
        threads = info.get("threads")
        state["device"] = f"{engine} \u00b7 {threads} threads" if threads else engine
        print(f"[spireflow] model '{MODEL_ID}' loaded on {state['device']}", flush=True)
    except Exception as exc:  # noqa: BLE001
        state["ready"] = False
        state["error"] = f"{type(exc).__name__}: {exc}"
        print(f"[spireflow] model load failed: {state['error']}", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Spireflow STT", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def audio_duration(path: str) -> float | None:
    try:
        import soundfile as sf

        info = sf.info(path)
        return float(info.frames) / float(info.samplerate)
    except Exception:  # noqa: BLE001
        return None


def run_transcribe(path: str, hotwords: list[str] | None = None) -> dict:
    if not state["ready"] or state["speech"] is None:
        raise HTTPException(status_code=503, detail=state["error"] or "Model not ready")

    speech = state["speech"]
    words = [w for w in (hotwords or []) if w.strip()]
    started = time.perf_counter()
    try:
        result = speech.transcribe(path, hotwords=words or None)
    except TypeError:
        result = speech.transcribe(str(path))
    wall = time.perf_counter() - started

    if isinstance(result, tuple):
        text = result[0] if len(result) > 0 else ""
        decode_s = result[1] if len(result) > 1 else None
        audio_s = result[2] if len(result) > 2 else None
    else:
        text, decode_s, audio_s = str(result), None, None

    duration = audio_s if audio_s else audio_duration(path)

    return {
        "text": (text or "").strip(),
        "model": MODEL_ID,
        "durationSec": round(float(duration), 3) if duration else 0.0,
        "decodeSec": round(float(decode_s) if decode_s is not None else wall, 3),
    }


@app.get("/health")
def health() -> dict:
    return {
        "ready": state["ready"],
        "model": MODEL_ID,
        "device": state["device"],
        "error": state["error"],
    }


class PathRequest(BaseModel):
    path: str
    hotwords: list[str] = []


@app.post("/transcribe_path")
def transcribe_path(req: PathRequest) -> dict:
    candidate = Path(req.path)
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
    return run_transcribe(str(candidate), req.hotwords)


@app.post("/transcribe")
def transcribe_upload(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    try:
        return run_transcribe(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    print(f"[spireflow] starting sidecar on 127.0.0.1:{PORT}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
