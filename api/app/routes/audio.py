"""OpenAI-compatible audio endpoints.

    POST /v1/audio/transcriptions
    POST /v1/audio/translations

Accepts the same multipart form fields as OpenAI (``file``, ``model``,
``language``, ``prompt``, ``response_format``, ``temperature``,
``timestamp_granularities[]``) and returns the same body shapes.
"""

from __future__ import annotations

import time
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from starlette.concurrency import run_in_threadpool

from ..config import settings
from ..database import record_request
from ..engine import engine
from ..errors import OpenAIError
from ..formats import to_srt, to_vtt, verbose_json
from ..security import Principal, require_api_key

router = APIRouter(tags=["audio"])

_RESPONSE_FORMATS = {"json", "text", "srt", "verbose_json", "vtt"}
_MAX_HOTWORDS = 25


def _prompt_to_hotwords(prompt: str | None) -> list[str]:
    """Best-effort map of OpenAI's free-text `prompt` onto Phonon-2.5 hotwords."""
    if not prompt:
        return []
    parts = prompt.replace("\n", ",").split(",")
    seen: list[str] = []
    for part in parts:
        term = part.strip()
        if term and term not in seen:
            seen.append(term)
    return seen[:_MAX_HOTWORDS]


async def _handle(
    *,
    request: Request,
    task: str,
    file: UploadFile,
    model: str,
    language: str | None,
    prompt: str | None,
    response_format: str,
    granularities: list[str] | None,
    principal: Principal,
) -> Response:
    if response_format not in _RESPONSE_FORMATS:
        raise OpenAIError(
            f"'{response_format}' is not a supported response_format. Choose one of: "
            + ", ".join(sorted(_RESPONSE_FORMATS))
            + ".",
            400,
            code="invalid_response_format",
            param="response_format",
        )

    data = await file.read()
    if not data:
        raise OpenAIError(
            "The uploaded file is empty.", 400, code="empty_file", param="file"
        )
    limit = settings.max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise OpenAIError(
            f"The uploaded file is too large ({len(data)} bytes); the limit is "
            f"{settings.max_upload_mb} MB.",
            413,
            code="file_too_large",
            param="file",
        )

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    tmp = NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(data)
    tmp.close()

    started = time.perf_counter()
    try:
        result = await run_in_threadpool(
            engine.transcribe, tmp.name, _prompt_to_hotwords(prompt)
        )
    except OpenAIError as exc:
        record_request(
            key_id=principal.id,
            endpoint=request.url.path,
            model=model,
            status=exc.status_code,
            audio_seconds=None,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )
        raise
    finally:
        try:
            Path(tmp.name).unlink(missing_ok=True)
        except OSError:
            pass

    record_request(
        key_id=principal.id,
        endpoint=request.url.path,
        model=model,
        status=200,
        audio_seconds=result.duration,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )

    if response_format == "text":
        return PlainTextResponse(result.text)
    if response_format == "srt":
        return Response(to_srt(result), media_type="application/x-subrip; charset=utf-8")
    if response_format == "vtt":
        return Response(to_vtt(result), media_type="text/vtt; charset=utf-8")
    if response_format == "verbose_json":
        payload = verbose_json(
            result,
            task=task,
            language=language or "auto",
            granularities=granularities or [],
        )
        return JSONResponse(payload)
    return JSONResponse({"text": result.text})


@router.post("/audio/transcriptions")
async def transcriptions(
    request: Request,
    file: UploadFile = File(..., description="The audio file to transcribe."),
    model: str = Form(default=settings.model),
    language: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
    response_format: str = Form(default="json"),
    temperature: float | None = Form(default=None),
    timestamp_granularities: list[str] | None = Form(
        default=None, alias="timestamp_granularities[]"
    ),
    principal: Principal = Depends(require_api_key),
) -> Response:
    """Transcribe audio, mirroring `POST /v1/audio/transcriptions`."""
    return await _handle(
        request=request,
        task="transcribe",
        file=file,
        model=model,
        language=language,
        prompt=prompt,
        response_format=response_format,
        granularities=timestamp_granularities,
        principal=principal,
    )


@router.post("/audio/translations")
async def translations(
    request: Request,
    file: UploadFile = File(..., description="The audio file to translate."),
    model: str = Form(default=settings.model),
    prompt: str | None = Form(default=None),
    response_format: str = Form(default="json"),
    temperature: float | None = Form(default=None),
    principal: Principal = Depends(require_api_key),
) -> Response:
    """Translate audio to English. Phonon-2.5 detects the spoken language but
    does not translate, so this mirrors transcription with OpenAI's
    `task: "translate"` marker in verbose output."""
    return await _handle(
        request=request,
        task="translate",
        file=file,
        model=model,
        language=None,
        prompt=prompt,
        response_format=response_format,
        granularities=None,
        principal=principal,
    )
