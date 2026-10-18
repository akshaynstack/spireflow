# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ffmpeg decodes mp3/m4a/…; libsndfile backs `soundfile` for wav/flac/ogg/aiff.
# curl is used by the HEALTHCHECK.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
RUN pip install --upgrade pip \
    && pip install --extra-index-url "${TORCH_INDEX_URL}" -r requirements.txt

COPY app ./app
COPY run.py ./

# Data (SQLite DB + model cache) lives on the /data volume so it survives
# container rebuilds.
ENV SPIREFLOW_HOST=0.0.0.0 \
    SPIREFLOW_PORT=8000 \
    SPIREFLOW_DB=/data/spireflow.db \
    FERMION_CACHE_DIR=/data/fermion-cache
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8000

# Model load can take 10-120s on first run, hence the generous start period.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
