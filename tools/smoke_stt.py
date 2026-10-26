"""Smoke test: load Phonon-2.5 and run a transcription through the public API."""

import inspect
import os

import numpy as np
import soundfile as sf

import fermion

MODEL_ID = os.environ.get("SPIREFLOW_MODEL", "phonon-2.5-en")


def make_wav(path: str, seconds: float = 2.0, sr: int = 16000) -> None:
    t = np.linspace(0, seconds, int(sr * seconds), endpoint=False)
    tone = 0.2 * np.sin(2 * np.pi * 220 * t)
    sf.write(path, tone.astype(np.float32), sr)


def main() -> None:
    print(f"loading {MODEL_ID} (first run downloads ~156 MB)...")
    speech = fermion.load_speech(MODEL_ID)
    print("speech type:", type(speech))
    methods = [m for m in dir(speech) if not m.startswith("_")]
    print("methods:", methods)
    for name in ("transcribe", "transcribe_detailed", "transcribe_array"):
        if hasattr(speech, name):
            try:
                print(f"{name} sig:", inspect.signature(getattr(speech, name)))
            except (TypeError, ValueError):
                pass

    print("device:", getattr(speech, "device", "n/a"))

    make_wav("_smoke.wav")
    result = speech.transcribe("_smoke.wav")
    print("transcribe returned:", type(result), repr(result)[:300])


if __name__ == "__main__":
    main()
