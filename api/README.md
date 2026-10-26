# Spireflow API

An **OpenAI-compatible speech-to-text API** powered by
[Phonon-2.5](https://www.fermionresearch.com/models/phonon-2-5/) (via the
`fermion-research` package).

It is a standalone service — completely separate from the desktop app — that you
can run **locally without Docker** or ship as a **Docker container**. Point any
OpenAI client at it, upload an audio file, and get a transcript back in the
standard OpenAI shape.

```
POST /v1/audio/transcriptions   ->  {"text": "..."}
```

## Features

- OpenAI-compatible `POST /v1/audio/transcriptions` and `/v1/audio/translations`
- Response formats: `json`, `text`, `srt`, `verbose_json`, `vtt`
- Optional word-level timestamps (`timestamp_granularities[]=word`)
- API keys stored **hashed** (SHA-256) in a local **SQLite** database
- Per-request usage logging and a `/v1/usage` reporting endpoint
- `GET /v1/models` so OpenAI SDKs work unchanged (`whisper-1` is aliased)
- Optional `prompt` mapped onto Phonon-2.5 hotwords
- 25 languages, detected automatically from the audio
- ffmpeg transcoding for mp3/m4a and friends (falls back to libsndfile formats)
- Runs on CPU by default; GPU is a build-arg away

## Layout

```
api/
  app/
    main.py        FastAPI app, CORS, lifespan, key bootstrap
    config.py      Environment-driven settings
    database.py    SQLite: api_keys + requests (usage)
    security.py    Bearer-token auth dependency
    apikeys.py     Key minting / hashing helpers
    engine.py      Phonon-2.5 loader + transcription wrapper
    formats.py     json / text / srt / vtt / verbose_json rendering
    errors.py      OpenAI-shaped error envelope + handlers
    cli.py         Create / list / revoke API keys
    routes/        health, audio, models, usage
  tests/           pytest suite (no model download needed)
  Dockerfile
  docker-compose.yml
  requirements.txt
  run.py           Local dev entrypoint
```

## Quick start (local, no Docker)

Requires **Python 3.10+**. ffmpeg is only needed for mp3/m4a/… (wav/flac/ogg work
out of the box).

```bash
cd api

# 1. Create an isolated environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# 2. Install dependencies (downloads the model on first transcription)
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# 3. Run the dev server (autoreload)
python run.py
```

On first boot you'll see a generated API key printed to the console (or set your
own with `SPIREFLOW_BOOTSTRAP_KEY`). The server listens on
`http://localhost:8000`; interactive docs are at `/docs`.

## Quick start (Docker)

```bash
cd api

# Optionally override the bootstrap key / model:
export SPIREFLOW_BOOTSTRAP_KEY=sk-spireflow-my-secret   # Windows: set SPIREFLOW_BOOTSTRAP_KEY=...

docker compose up --build
```

The service is on `http://localhost:8000`. Two things are persisted in the
`spireflow-data` volume: the SQLite database and the downloaded model cache
(`FERMION_CACHE_DIR=/data/fermion-cache`), so restarts are fast.

Plain Docker without compose:

```bash
docker build -t spireflow-api .
docker run --rm -p 8000:8000 \
  -e SPIREFLOW_BOOTSTRAP_KEY=sk-spireflow-my-secret \
  -v spireflow-data:/data \
  spireflow-api
```

## API keys

Keys look like `sk-spireflow-…`; only their SHA-256 hash is stored. Send the key
as a bearer token:

```
Authorization: Bearer sk-spireflow-xxxxxxxx
```

Manage keys with the CLI (run from the `api/` directory so it uses the same
SQLite database as the server):

```bash
python -m app.cli create-key --name "laptop"   # prints the key once
python -m app.cli list-keys
python -m app.cli revoke-key --id 2
python -m app.cli revoke-key --prefix sk-spireflow-ab12cd
```

Newly created keys are valid **immediately** — the server reads the database on
every request, so there is no restart needed. Share the printed key with the
person; it is shown only once and stored hashed.

On startup the service bootstraps a key so it is usable immediately:

- If `SPIREFLOW_BOOTSTRAP_KEY` is set, that exact key is ensured to exist.
- Otherwise, if no keys exist at all, one is generated and printed to the logs.

Set `SPIREFLOW_REQUIRE_AUTH=false` to disable auth entirely (handy for a private
dev box — **never** do this on a public host).

## Usage

### curl

```bash
# JSON (default)
curl http://localhost:8000/v1/audio/transcriptions \
  -H "Authorization: Bearer $SPIREFLOW_KEY" \
  -F file=@sample.wav \
  -F model=whisper-1

# Plain text
curl http://localhost:8000/v1/audio/transcriptions \
  -H "Authorization: Bearer $SPIREFLOW_KEY" \
  -F file=@sample.wav -F response_format=text

# Subtitles
curl http://localhost:8000/v1/audio/transcriptions \
  -H "Authorization: Bearer $SPIREFLOW_KEY" \
  -F file=@sample.wav -F response_format=srt
```

### OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="sk-spireflow-...",
)

with open("sample.wav", "rb") as audio:
    result = client.audio.transcriptions.create(
        model="whisper-1",          # aliased to the configured model
        file=audio,
        response_format="verbose_json",
        timestamp_granularities=["word"],
    )

print(result.text)
```

### JavaScript SDK

```js
import OpenAI from "openai";
import fs from "node:fs";

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "sk-spireflow-...",
});

const result = await client.audio.transcriptions.create({
  model: "whisper-1",
  file: fs.createReadStream("sample.wav"),
});
console.log(result.text);
```

## Endpoints

| Method | Path                        | Auth | Description                                   |
| ------ | --------------------------- | ---- | --------------------------------------------- |
| POST   | `/v1/audio/transcriptions`  | yes  | Transcribe audio (OpenAI-compatible)          |
| POST   | `/v1/audio/translations`    | yes  | Translate audio to English (OpenAI-compatible)|
| GET    | `/v1/models`                | yes  | List available model ids                      |
| GET    | `/v1/models/{model}`        | yes  | Retrieve one model                            |
| GET    | `/v1/usage`                 | yes  | Per-key request/audio usage (last 30 days)    |
| GET    | `/health`                   | no   | Readiness probe (Docker healthcheck)          |
| GET    | `/`                         | no   | Service info                                  |
| GET    | `/docs`                     | no   | Swagger UI                                    |

### Form fields (`/v1/audio/transcriptions`)

| Field                       | Type       | Notes                                                        |
| --------------------------- | ---------- | ------------------------------------------------------------ |
| `file`                      | file       | **required**                                                 |
| `model`                     | string     | default = configured model; `whisper-1` accepted             |
| `language`                  | string     | informational; defaults to `auto` (the model detects it)     |
| `prompt`                    | string     | mapped onto Phonon-2.5 hotwords (comma/newline separated)    |
| `response_format`           | string     | `json` (default) · `text` · `srt` · `verbose_json` · `vtt`   |
| `temperature`               | float      | accepted for compatibility; currently unused                 |
| `timestamp_granularities[]` | repeatable | `word` adds `words[]` to `verbose_json`                      |

## Configuration

Settings are read from environment variables. If `api/.env` exists it is loaded
automatically at startup (real environment variables always take precedence over
`.env`). **Changing `.env` requires a restart** unless you run with autoreload.

To bootstrap a specific key, set `SPIREFLOW_BOOTSTRAP_KEY` in `.env` and restart;
that exact key is ensured to exist. To mint additional keys for other people, use
the CLI (below) — no restart needed, they become valid immediately.

| Env var                     | Default                | Purpose                                          |
| --------------------------- | ---------------------- | ------------------------------------------------ |
| `SPIREFLOW_HOST`            | `0.0.0.0`              | Bind host                                        |
| `SPIREFLOW_PORT`            | `8000`                 | Bind port                                        |
| `SPIREFLOW_MODEL`           | `phonon-2.5`           | Model passed to `fermion.load_speech`            |
| `SPIREFLOW_MODELS`          | `whisper-1`            | Extra ids advertised by `/v1/models` (comma sep) |
| `SPIREFLOW_REQUIRE_AUTH`    | `true`                 | Enforce bearer-token auth on `/v1` routes        |
| `SPIREFLOW_BOOTSTRAP_KEY`   | –                      | Key ensured to exist at startup                  |
| `SPIREFLOW_DB`              | `data/spireflow.db`    | SQLite database path                             |
| `SPIREFLOW_MAX_UPLOAD_MB`   | `100`                  | Max upload size per request                      |
| `SPIREFLOW_CORS_ORIGINS`    | `*`                    | Allowed CORS origins (comma separated)           |
| `SPIREFLOW_LOG_REQUESTS`    | `true`                 | Log each request to SQLite                       |
| `SPIREFLOW_LOAD_MODEL`      | `true`                 | Load the model at startup (tests set `false`)    |
| `FERMION_CACHE_DIR`         | –                      | Where model weights are cached                   |

## GPU / CUDA

The default image installs CPU-only torch. For a GPU host, build from a CUDA
base and point the torch index at the CUDA channel:

```bash
docker build \
  --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cu121 \
  --build-arg ... \
  -t spireflow-api:gpu .
```

(Adjust the base image to `nvidia/cuda:...` and run with `--gpus all`; the
exact combo depends on your driver. CPU is the supported default.)

## Tests

```bash
cd api
pip install -r requirements-dev.txt
pytest
```

The suite stubs the transcription engine, so it runs in seconds and never
downloads the model.

## Notes & limitations

- Brand-new model loading takes 10–120 s; `/health` reports `"status":
  "loading"` until ready. Requests during load return `503 model_not_ready`.
- The engine is single-flight: concurrent transcription requests are serialised
  behind a lock. Scale with more containers/replicas rather than workers (each
  worker would load its own copy of the model).
- Phonon-2.5 detects the language from the audio; `language` is informational and
  `translations` behaves like transcription (the model transcribes, it does not
  translate).
- `srt`/`vtt` timestamps come from Phonon-2.5's own token timings and are rounded
  to milliseconds.
- Set `SPIREFLOW_MODEL=phonon-2.5-en` for the English-only model, or `phonon-2`
  to pin the previous release.

## License

The service code is MIT-licensed, like the rest of Spireflow. The
Phonon-2.5 weights it downloads are CC-BY-4.0 by Fermion Research (a derivative
of NVIDIA Parakeet TDT 0.6B v3); see [`../NOTICE`](../NOTICE) and
[`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
