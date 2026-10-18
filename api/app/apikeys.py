"""Pure helpers for minting, hashing and comparing API keys.

Kept dependency-free so both the database layer and the auth dependency can use
them without an import cycle.
"""

from __future__ import annotations

import hashlib
import secrets

#: Human-recognisable prefix, mirroring OpenAI's `sk-...` convention.
KEY_PREFIX = "sk-spireflow-"

_PREFIX_VISIBLE = len(KEY_PREFIX) + 6


def generate_key() -> str:
    """Return a fresh, high-entropy API key."""
    return KEY_PREFIX + secrets.token_urlsafe(32)


def hash_key(plain: str) -> str:
    """SHA-256 of the plaintext key: only the hash is ever persisted."""
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def key_prefix(plain: str) -> str:
    """A short, non-secret fragment used to identify a key in listings."""
    return plain[:_PREFIX_VISIBLE]


def verify_key(plain: str, stored_hash: str) -> bool:
    """Constant-time comparison of a presented key against a stored hash."""
    return secrets.compare_digest(hash_key(plain), stored_hash)
