"""FastAPI application: wiring, CORS, lifespan and startup bootstrap."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import __version__
from .config import settings
from .database import create_key, ensure_key, init_db, list_keys
from .engine import engine
from .errors import (
    OpenAIError,
    http_error_handler,
    openai_error_handler,
    validation_error_handler,
)
from .routes import audio, health, models, usage


def _bootstrap() -> None:
    """Make the service usable on first run without a manual key step."""
    if settings.bootstrap_key:
        result = ensure_key("bootstrap", settings.bootstrap_key)
        if not result.get("existing"):
            print("[spireflow-api] bootstrapped API key from SPIREFLOW_BOOTSTRAP_KEY", flush=True)

    if settings.require_auth and not list_keys():
        created = create_key("default")
        print("[spireflow-api] no API keys found — generated one for you:", flush=True)
        print(f"[spireflow-api]   {created['key']}", flush=True)
        print("[spireflow-api] store it now; it will not be shown again.", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    _bootstrap()
    if settings.load_model_on_start:
        engine.load()
    yield


app = FastAPI(
    title="Spireflow API",
    version=__version__,
    description=(
        "OpenAI-compatible speech-to-text API powered by Phonon-2.5. "
        "Point any OpenAI client at this base URL and call "
        "`/v1/audio/transcriptions` with an audio file."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(OpenAIError, openai_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)

app.include_router(health.router)
app.include_router(audio.router, prefix="/v1")
app.include_router(models.router, prefix="/v1")
app.include_router(usage.router, prefix="/v1")
