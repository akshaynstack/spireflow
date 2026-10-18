"""`GET /v1/usage` — per-key usage from the SQLite log."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..database import usage_summary
from ..security import Principal, require_api_key

router = APIRouter()


@router.get("/usage")
def usage(
    days: int = Query(default=30, ge=1, le=365),
    _: Principal = Depends(require_api_key),
) -> dict:
    return usage_summary(days=days)
