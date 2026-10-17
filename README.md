# Spireflow

A Windows dictation app in the spirit of [Detta](https://fermionresearch.com/products/detta/):
hold a key anywhere, speak, and your words land in whatever app has focus — plus a
history feed and speaking stats. Speech recognition runs **locally** on
[Phonon-2](https://www.fermionresearch.com/models/phonon-2/).

> Status: milestone 2. The shell, the local model, file transcription, the
> history/stats dashboard, and **hold-to-talk dictation into any app** all work.

## Architecture

```
┌──────────────────────────── Electron ────────────────────────────┐
│  main process (Node)                                             │
│   • creates the window + the hidden overlay window               │
│   • global Ctrl+Space hook (node-global-key-listener)            │
│   • spawns + supervises the Python sidecar                       │
│   • JSON history store  (userData/transcripts.json)              │
│   • IPC:  server:status · transcribe:file · transcribe:blob ·    │
│           history:* · settings:* · hotkey:* · dictation:*        │
│            ▲ ipcMain                    │ fetch (127.0.0.1:8756) │
│            │                            ▼                        │
│  preload (contextBridge)          ┌─────────────────────┐        │
│            ▲                      │  Python sidecar      │        │
│            │ window.spireflow     │  FastAPI + fermion   │        │
│  renderer (React)  ──────────────▶│  Phonon-2 (CPU)      │        │
│   sidebar · hero · feed · stats   └─────────────────────┘        │
│                                                                   │
│  overlay window (transparent, click-through, non-activating)      │
│   • mic capture + waveform; pastes via clipboard + Ctrl+V        │
└──────────────────────────────────────────────────────────────────┘
```

- **UI** never talks to Python directly; it goes through typed IPC and preload.
- **Sidecar** owns the model. It is loaded once at startup (10–40 s) and kept warm.
- **Port** is `8756` by default (`SPIREFLOW_PORT` to change it).

## Prerequisites

- Node.js 18+ (built with Node 24)
- Python 3.10–3.14 (built with 3.14). On Windows the model runs on the **CPU engine**.

## Setup

```bash
# 1. Node dependencies
npm install

# Electron's binary sometimes doesn't download on first install. If `npm run dev`
# reports "Electron uninstall", fetch it once:
node node_modules/electron/install.js

# 2. Python venv + Phonon-2 (downloads torch ~250 MB)
npm run setup:py
# or:  powershell -ExecutionPolicy Bypass -File server\setup.ps1
```

The Phonon-2 weights (~164 MB) download automatically on the **first run** and are
cached at `%USERPROFILE%\.cache\fermion\`.

## Run

```bash
npm run dev        # Electron + React with hot reload
```

The first launch loads the model; the hero banner shows **Loading model…** then
**Phonon-2 · ready on CPU · N threads**.

Other scripts:

```bash
npm run build       # production bundle into out/
npm run start       # preview the production bundle
npm run typecheck   # tsc for main/preload and renderer
```

## Build a self-contained installer

The installer bundles **everything** — the Electron app, a frozen Python sidecar
(PyInstaller) and the **Phonon-2 weights** — so the end user needs no Python, no
model download and no separate server. It installs like any normal desktop app:
double-click the setup, pick a folder, and run it from the Start Menu / desktop.
No terminal window ever appears.

```bash
npm install
npm run setup:py                       # local venv with fermion-research
server\.venv\Scripts\python.exe -m pip install pyinstaller

npm run dist:win                       # -> release/Spireflow-Setup-0.1.0.exe
# or
npm run dist:mac                       # -> release/Spireflow-0.1.0-<arch>.dmg
```

`dist:*` runs four steps: `electron-vite build` → freeze the sidecar
(`tools/build_sidecar.mjs` via `server/spireflow-sidecar.spec`) → stage the model
cache (`tools/stage_model.mjs` copies `~/.cache/fermion/speech` into
`build/fermion-cache`) → `electron-builder`.

Inside the packaged app the frozen sidecar and the weights sit next to the app
(`resources/sidecar/`, `resources/fermion-cache/`); the main process sets
`FERMION_CACHE_DIR` to the bundled cache, so the model loads fully offline on the
very first run.

**Build on the target OS.** A Windows installer must be built on Windows and the
macOS `.dmg` on macOS — PyInstaller cannot cross-compile. `.github/workflows/release.yml`
runs both on a runner matrix.

Notes:

- The installer is large (~480 MB): that is torch plus the model weights.
- The frozen sidecar is built windowed (`console=False`), so no console appears;
  its logs are piped to the Electron main process.
- macOS needs **Accessibility** (global hotkey) and **Microphone** permission.
  Without a Developer ID the `.dmg` is ad-hoc signed and Gatekeeper will warn.

## Push-to-talk dictation

Hold the push-to-talk shortcut (default **Ctrl + Space**, rebindable in Settings)
in any app and speak; release to have the text typed where your cursor is.

1. A global low-level keyboard hook (`src/main/hotkey.ts`) sees Ctrl+Space go down
   — Electron's own `globalShortcut` can't detect key *release*, which is why a
   native hook is used.
2. Main shows a hidden, transparent **overlay window** pinned to the right edge,
   vertically centered on the active display. It is `focusable: false` and
   click-through, so your app keeps focus — nothing is stolen.
3. The overlay opens the microphone (`getUserMedia`), draws a live waveform from
   an `AnalyserNode`, and records Opus/webm with `MediaRecorder`. Optional tones
   play on start/stop.
4. On release the whole clip is sent to main, transcoded to 16 kHz mono wav, and
   transcribed by the sidecar.
5. The transcript is copied to the clipboard and pasted with a synthesized
   **Ctrl+V** into the previously focused window, then appended to history.

Under **Settings → Dictation** you can rebind the shortcut: click *Change
shortcut* and press any modifier combo (Esc cancels, *Reset to Ctrl + Space*
restores the default). The combo is captured from the same global hook, so any
key the OS reports works.

Choose the input device and run the built-in mic/hotkey checks under
**Settings → Test & diagnostics** (level meter, a 5-second sample you can
transcribe, and a live push-to-talk indicator).

## Supported audio

`wav`, `flac`, `ogg`, `aiff` are read directly by the model. `mp3`, `m4a`, `mp4`,
`aac`, `wma`, `opus`, and `webm` are transcoded to 16 kHz mono wav with the
**bundled ffmpeg** (`ffmpeg-static`) before transcription — no system ffmpeg needed.

## How a transcription flows

1. You click **Transcribe a File** → `dialog.showOpenDialog`.
2. If needed, main converts the file to wav (`src/main/audio.ts`).
3. Main POSTs the path to the sidecar: `POST /transcribe_path {"path": "..."}`.
4. Sidecar runs `speech.transcribe(path)` and returns `{ text, durationSec, decodeSec }`.
5. Main computes words/minute, appends an entry to the JSON store, returns it.
6. The renderer prepends it to the feed; stats recompute from history.

## Project layout

```
src/
  main/        Electron main: window, overlay window, global hotkey, paste,
               sidecar manager, history, audio conversion, IPC
  preload/     contextBridge APIs (window.spireflow + overlay)
  renderer/    React UI (title bar, sidebar, hero, feed, stats, settings)
               + overlay.ts (mic capture + waveform)
  shared/      types shared across the three processes
server/
  app.py           FastAPI sidecar that loads Phonon-2
  spireflow-sidecar.spec   PyInstaller spec (frozen standalone sidecar)
  requirements.txt
  setup.ps1
tools/
  smoke_stt.py     load the model + transcribe a generated wav (no Electron)
  make_icon.py     regenerate build/icon.ico + build/icon.png
  build_sidecar.mjs   freeze the sidecar for the installer
  stage_model.mjs     copy the model cache into build/fermion-cache
  afterPack.js        strip other platforms' key-server binaries
build/
  icon.ico, icon.png   app icon (window taskbar + installer)
electron-builder.yml   packaging config (NSIS installer + .dmg)
```

Regenerate the icon after editing the brand mark:

```bash
server\.venv\Scripts\python.exe -m pip install -r tools\requirements.txt
server\.venv\Scripts\python.exe tools\make_icon.py
```

## Sidecar API

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ ready, model, device, error }` |
| POST | `/transcribe_path` | `{"path": "C:/clip.wav"}` | `{ text, model, durationSec, decodeSec }` |
| POST | `/transcribe` | multipart `file` | same as above |

Test it standalone:

```bash
server\.venv\Scripts\python.exe server\app.py
curl http://127.0.0.1:8756/health
```

## Roadmap

- [x] Electron + React shell, Detta-style UI
- [x] Phonon-2 sidecar, file transcription, history + stats
- [x] mp3/m4a and other formats via bundled ffmpeg
- [x] Collapsible sidebar + custom title bar (no native menu)
- [x] Settings, About, Insights, Dictionary (hotwords), Quick Notes
- [x] Custom app icon + Windows AppUserModelId
- [x] Hold-to-talk global hotkey (native hook) + Web Audio mic capture
- [x] Configurable push-to-talk keybind (default Ctrl + Space, live capture)
- [x] Waveform overlay (right edge, non-activating) + start/stop tones
- [x] Paste transcript into the focused app (clipboard + Ctrl+V)
- [x] Microphone device picker + Settings test/diagnostics area
- [x] Hotwords, dictionary, insights, quick notes
- [x] Packaging with electron-builder (self-contained installer: frozen sidecar + bundled model)

## Attribution

Speech recognition is [Phonon-2](https://huggingface.co/FermionResearch/Phonon-2)
by [Fermion Research](https://fermionresearch.com), released under **CC-BY-4.0**
(a derivative of NVIDIA Parakeet TDT 0.6B v3). Keep this attribution in any
redistribution or commercial use.
