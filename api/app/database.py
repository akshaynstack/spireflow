"""SQLite persistence for API keys and request/usage logs.

The database is a single file (WAL mode) so the service stays dependency-free
and trivially portable. Connections are opened per operation; a process-local
lock serialises writes.
"""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator, Optional

from .apikeys import generate_key, hash_key, key_prefix
from .config import settings

_write_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS api_keys (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    prefix       TEXT    NOT NULL,
    key_hash     TEXT    NOT NULL UNIQUE,
    created_at   TEXT    NOT NULL,
    last_used_at TEXT,
    revoked      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id        INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
    endpoint      TEXT    NOT NULL,
    model         TEXT,
    status        INTEGER NOT NULL,
    audio_seconds REAL,
    latency_ms    INTEGER,
    created_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_key     ON requests(key_id);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    path = Path(settings.db_path)
    if path.parent and str(path.parent) not in ("", "."):
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with _write_lock, connection() as conn:
        conn.executescript(SCHEMA)


def create_key(name: str, plaintext: Optional[str] = None) -> dict:
    """Create a key and return it **including the plaintext** (shown once)."""
    plain = plaintext or generate_key()
    record = {
        "name": name or "default",
        "prefix": key_prefix(plain),
        "key_hash": hash_key(plain),
        "created_at": _now(),
    }
    with _write_lock, connection() as conn:
        cur = conn.execute(
            "INSERT INTO api_keys (name, prefix, key_hash, created_at) "
            "VALUES (:name, :prefix, :key_hash, :created_at)",
            record,
        )
        key_id = cur.lastrowid
    return {"id": key_id, "name": record["name"], "prefix": record["prefix"], "key": plain}


def ensure_key(name: str, plaintext: str) -> dict:
    """Idempotently create a key from a known plaintext (bootstrap)."""
    digest = hash_key(plaintext)
    with _write_lock, connection() as conn:
        row = conn.execute(
            "SELECT id, name, prefix FROM api_keys WHERE key_hash = ?", (digest,)
        ).fetchone()
        if row is not None:
            return {
                "id": row["id"],
                "name": row["name"],
                "prefix": row["prefix"],
                "key": plaintext,
                "existing": True,
            }
        cur = conn.execute(
            "INSERT INTO api_keys (name, prefix, key_hash, created_at) VALUES (?, ?, ?, ?)",
            (name, key_prefix(plaintext), digest, _now()),
        )
        return {
            "id": cur.lastrowid,
            "name": name,
            "prefix": key_prefix(plaintext),
            "key": plaintext,
            "existing": False,
        }


def list_keys() -> list[dict]:
    with connection() as conn:
        rows = conn.execute(
            "SELECT id, name, prefix, created_at, last_used_at, revoked "
            "FROM api_keys ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


def revoke_key(identifier: str | int) -> bool:
    """Revoke by numeric id or by displayed prefix. Returns True if a row changed."""
    with _write_lock, connection() as conn:
        if isinstance(identifier, int) or str(identifier).isdigit():
            cur = conn.execute(
                "UPDATE api_keys SET revoked = 1 WHERE id = ?", (int(identifier),)
            )
        else:
            cur = conn.execute(
                "UPDATE api_keys SET revoked = 1 WHERE prefix = ?", (str(identifier),)
            )
        return cur.rowcount > 0


def get_key_by_hash(digest: str) -> Optional[sqlite3.Row]:
    with connection() as conn:
        return conn.execute(
            "SELECT * FROM api_keys WHERE key_hash = ?", (digest,)
        ).fetchone()


def touch_key(key_id: int) -> None:
    with _write_lock, connection() as conn:
        conn.execute(
            "UPDATE api_keys SET last_used_at = ? WHERE id = ?", (_now(), key_id)
        )


def record_request(
    *,
    key_id: Optional[int],
    endpoint: str,
    model: Optional[str],
    status: int,
    audio_seconds: Optional[float],
    latency_ms: Optional[int],
) -> None:
    if not settings.log_requests:
        return
    with _write_lock, connection() as conn:
        conn.execute(
            "INSERT INTO requests (key_id, endpoint, model, status, audio_seconds, "
            "latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (key_id, endpoint, model, status, audio_seconds, latency_ms, _now()),
        )


def usage_summary(days: int = 30) -> dict:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    with connection() as conn:
        totals = conn.execute(
            "SELECT COUNT(*) AS requests, "
            "COALESCE(SUM(audio_seconds), 0) AS audio_seconds "
            "FROM requests WHERE created_at >= ?",
            (since,),
        ).fetchone()
        per_key = conn.execute(
            "SELECT k.id, k.name, k.prefix, COUNT(r.id) AS requests, "
            "COALESCE(SUM(r.audio_seconds), 0) AS audio_seconds "
            "FROM api_keys k "
            "LEFT JOIN requests r ON r.key_id = k.id AND r.created_at >= ? "
            "GROUP BY k.id ORDER BY requests DESC",
            (since,),
        ).fetchall()
    return {
        "object": "usage",
        "window_days": days,
        "total_requests": totals["requests"],
        "total_audio_seconds": round(float(totals["audio_seconds"]), 3),
        "by_key": [dict(row) for row in per_key],
    }
