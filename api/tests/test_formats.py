from __future__ import annotations

from app.engine import Segment, TranscriptResult, Word
from app.formats import _timestamp, to_srt, to_vtt, verbose_json


def _result() -> TranscriptResult:
    return TranscriptResult(
        text="hello world",
        duration=2.0,
        model="phonon-2",
        segments=[Segment(id=1, start=0.0, end=2.0, text="hello world")],
        words=[Word(text="hello", start=0.0, end=1.0), Word(text="world", start=1.0, end=2.0)],
        timed=True,
    )


def test_timestamp_formatting():
    assert _timestamp(0, comma=True) == "00:00:00,000"
    assert _timestamp(3661.5, comma=True) == "01:01:01,500"
    assert _timestamp(3661.5, comma=False) == "01:01:01.500"
    assert _timestamp(-3, comma=True) == "00:00:00,000"


def test_srt():
    body = to_srt(_result())
    assert body.startswith("1\n00:00:00,000 --> 00:00:02,000\nhello world")


def test_vtt():
    body = to_vtt(_result())
    assert body.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:02.000" in body


def test_verbose_json_with_words():
    payload = verbose_json(
        _result(), task="transcribe", language="english", granularities=["word"]
    )
    assert payload["task"] == "transcribe"
    assert payload["duration"] == 2.0
    assert payload["segments"][0]["id"] == 0
    assert payload["words"][0] == {"word": "hello", "start": 0.0, "end": 1.0}


def test_verbose_json_without_words():
    payload = verbose_json(
        _result(), task="transcribe", language="english", granularities=[]
    )
    assert "words" not in payload


def test_srt_falls_back_to_whole_file_segment():
    result = TranscriptResult(text="solo", duration=1.25, model="phonon-2")
    body = to_srt(result)
    assert "00:00:00,000 --> 00:00:01,250" in body
