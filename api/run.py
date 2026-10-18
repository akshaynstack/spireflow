"""Local (non-Docker) development entrypoint.

    cd api
    python run.py

Serves on SPIREFLOW_HOST:SPIREFLOW_PORT (default 0.0.0.0:8000) with autoreload.
"""

from __future__ import annotations

import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
