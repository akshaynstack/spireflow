"""Render transcripts into OpenAI's response formats."""

from __future__ import annotations

from .engine import Segment, TranscriptResult


def _timestamp(seconds: float, *, comma: bool) -> str:
    total_ms = int(round(max(0.0, seconds) * 1000))
    hours, total_ms = divmod(total_ms, 3_600_000)
    minutes, total_ms = divmod(total_ms, 60_000)
    secs, millis = divmod(total_ms, 1000)
    sep = "," if comma else "."
    return f"{hours:02d}:{minutes:02d}:{secs:02d}{sep}{millis:03d}"


def _segments_or_whole(result: TranscriptResult) -> list[Segment]:
    if result.segments:
        return result.segments
    return [Segment(id=1, start=0.0, end=result.duration, text=result.text)]


def to_srt(result: TranscriptResult) -> str:
    blocks: list[str] = []
    for index, segment in enumerate(_segments_or_whole(result), start=1):
        blocks.append(str(index))
        blocks.append(
            f"{_timestamp(segment.start, comma=True)} --> "
            f"{_timestamp(segment.end, comma=True)}"
        )
        blocks.append(segment.text.strip())
        blocks.append("")
    return "\n".join(blocks).rstrip("\n") + "\n"


def to_vtt(result: TranscriptResult) -> str:
    lines = ["WEBVTT", ""]
    for segment in _segments_or_whole(result):
        lines.append(
            f"{_timestamp(segment.start, comma=False)} --> "
            f"{_timestamp(segment.end, comma=False)}"
        )
        lines.append(segment.text.strip())
        lines.append("")
    return "\n".join(lines).rstrip("\n") + "\n"


def verbose_json(
    result: TranscriptResult,
    *,
    task: str,
    language: str,
    granularities: list[str],
) -> dict:
    """OpenAI's `verbose_json` body, including optional word timestamps."""
    segments = _segments_or_whole(result)
    payload: dict = {
        "task": task,
        "language": language,
        "duration": round(result.duration, 3),
        "text": result.text,
        "segments": [
            {
                "id": index,
                "seek": 0,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text,
                "tokens": [],
                "temperature": 0.0,
                "avg_logprob": 0.0,
                "compression_ratio": 0.0,
                "no_speech_prob": 0.0,
            }
            for index, segment in enumerate(segments)
        ],
    }
    if "word" in granularities:
        payload["words"] = [
            {"word": word.text, "start": round(word.start, 3), "end": round(word.end, 3)}
            for word in result.words
        ]
    return payload
