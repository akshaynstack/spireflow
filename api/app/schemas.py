"""Pydantic schemas used for OpenAPI documentation."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    message: str
    type: str
    param: str | None = None
    code: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class ModelObject(BaseModel):
    id: str
    object: str = "model"
    created: int = 0
    owned_by: str = "spireflow"


class ModelList(BaseModel):
    object: str = "list"
    data: list[ModelObject]


class TranscriptionJson(BaseModel):
    text: str


class VerboseSegment(BaseModel):
    id: int
    seek: int = 0
    start: float
    end: float
    text: str


class VerboseJson(BaseModel):
    task: str
    language: str
    duration: float
    text: str
    segments: list[VerboseSegment] = Field(default_factory=list)
    words: list[dict] | None = None


class HealthResponse(BaseModel):
    status: str
    ready: bool
    model: str
    device: str | None = None
    error: str | None = None
    version: str
