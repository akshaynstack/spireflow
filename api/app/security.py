"""API-key authentication dependency."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header

from .apikeys import hash_key
from .config import settings
from .database import get_key_by_hash, touch_key
from .errors import OpenAIError


@dataclass(frozen=True)
class Principal:
    """The authenticated caller. ``id`` is None when auth is disabled."""

    id: int | None
    name: str
    prefix: str


def _extract_token(authorization: str | None, api_key: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None
    # Azure-style clients send the key in `api-key`.
    return api_key.strip() if api_key else None


async def require_api_key(
    authorization: str | None = Header(default=None),
    api_key: str | None = Header(default=None, alias="api-key"),
) -> Principal:
    """Validate ``Authorization: Bearer <key>`` and return the caller."""
    if not settings.require_auth:
        return Principal(id=None, name="anonymous", prefix="")

    token = _extract_token(authorization, api_key)
    if not token:
        raise OpenAIError(
            "You didn't provide an API key. Pass it in an "
            "'Authorization: Bearer <key>' header.",
            401,
            code="invalid_api_key",
        )

    row = get_key_by_hash(hash_key(token))
    if row is None or row["revoked"]:
        raise OpenAIError("Incorrect API key provided.", 401, code="invalid_api_key")

    touch_key(row["id"])
    return Principal(id=row["id"], name=row["name"], prefix=row["prefix"])
