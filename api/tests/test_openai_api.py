from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from app import database, security
from app.errors import OpenAIError


def test_models_list(client):
    body = client.get("/v1/models").json()
    ids = {item["id"] for item in body["data"]}
    assert body["object"] == "list"
    assert "whisper-1" in ids and "phonon-2" in ids


def test_retrieve_unknown_model(client):
    response = client.get("/v1/models/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "model_not_found"


def test_transcription_json(client, audio_bytes):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-1"},
    )
    assert response.status_code == 200
    assert response.json() == {"text": "hello world"}


def test_transcription_text_format(client, audio_bytes):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-1", "response_format": "text"},
    )
    assert response.status_code == 200
    assert response.text == "hello world"


def test_transcription_srt_format(client, audio_bytes):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-1", "response_format": "srt"},
    )
    assert response.status_code == 200
    assert "00:00:00,000 --> 00:00:02,000" in response.text


def test_transcription_verbose_json_with_words(client, audio_bytes):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={
            "model": "whisper-1",
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["task"] == "transcribe"
    assert body["words"][0]["word"] == "hello"


def test_translation_verbose_marks_task(client, audio_bytes):
    response = client.post(
        "/v1/audio/translations",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-1", "response_format": "verbose_json"},
    )
    assert response.status_code == 200
    assert response.json()["task"] == "translate"


def test_unsupported_response_format(client, audio_bytes):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-1", "response_format": "xml"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_response_format"


def test_empty_upload(client):
    response = client.post(
        "/v1/audio/transcriptions",
        files={"file": ("clip.wav", b"", "audio/wav")},
        data={"model": "whisper-1"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "empty_file"


def test_missing_file_is_openai_shaped(client):
    response = client.post("/v1/audio/transcriptions", data={"model": "whisper-1"})
    assert response.status_code == 422
    assert "error" in response.json()


def test_health_and_root(client):
    assert client.get("/health").json()["ready"] is True
    assert client.get("/").json()["name"] == "Spireflow API"


def test_usage_endpoint(client):
    body = client.get("/v1/usage").json()
    assert body["object"] == "usage"


# ---------------------------------------------------------------- auth logic


def _auth_settings():
    return SimpleNamespace(require_auth=True)


def test_bearer_key_accepted(monkeypatch):
    monkeypatch.setattr(security, "settings", _auth_settings())
    database.init_db()
    created = database.create_key("unit-test")
    principal = asyncio.run(
        security.require_api_key(authorization=f"Bearer {created['key']}", api_key=None)
    )
    assert principal.id == created["id"]


def test_invalid_key_rejected(monkeypatch):
    monkeypatch.setattr(security, "settings", _auth_settings())
    database.init_db()
    with pytest.raises(OpenAIError) as excinfo:
        asyncio.run(security.require_api_key(authorization="Bearer nope", api_key=None))
    assert excinfo.value.status_code == 401
    assert excinfo.value.code == "invalid_api_key"


def test_missing_key_rejected(monkeypatch):
    monkeypatch.setattr(security, "settings", _auth_settings())
    with pytest.raises(OpenAIError) as excinfo:
        asyncio.run(security.require_api_key(authorization=None, api_key=None))
    assert excinfo.value.status_code == 401
