"""Runtime configuration, read once from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv is optional
    load_dotenv = None

# Load `api/.env` (if present) before any setting is read. Explicit environment
# variables always win, so Docker/CI values are never clobbered.
if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, ""))
    except (TypeError, ValueError):
        return default


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    model: str
    models: tuple[str, ...]
    host: str
    port: int
    db_path: str
    require_auth: bool
    bootstrap_key: str | None
    cors_origins: tuple[str, ...]
    max_upload_mb: int
    load_model_on_start: bool
    cache_dir: str | None
    log_requests: bool

    @classmethod
    def from_env(cls) -> "Settings":
        model = os.getenv("SPIREFLOW_MODEL", "phonon-2.5")

        # The configured model is always served; extra ids let clients such as
        # the OpenAI SDKs (which hard-code `whisper-1`) work unchanged.
        advertised = [model, *_env_list("SPIREFLOW_MODELS", ["whisper-1"])]
        models: list[str] = []
        for candidate in advertised:
            if candidate and candidate not in models:
                models.append(candidate)

        return cls(
            model=model,
            models=tuple(models),
            host=os.getenv("SPIREFLOW_HOST", "0.0.0.0"),
            port=_env_int("SPIREFLOW_PORT", 8000),
            db_path=os.getenv("SPIREFLOW_DB", os.path.join("data", "spireflow.db")),
            require_auth=_env_bool("SPIREFLOW_REQUIRE_AUTH", True),
            bootstrap_key=os.getenv("SPIREFLOW_BOOTSTRAP_KEY") or None,
            cors_origins=tuple(_env_list("SPIREFLOW_CORS_ORIGINS", ["*"])),
            max_upload_mb=_env_int("SPIREFLOW_MAX_UPLOAD_MB", 100),
            load_model_on_start=_env_bool("SPIREFLOW_LOAD_MODEL", True),
            cache_dir=os.getenv("FERMION_CACHE_DIR") or None,
            log_requests=_env_bool("SPIREFLOW_LOG_REQUESTS", True),
        )


settings = Settings.from_env()
