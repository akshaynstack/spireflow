# Contributing to Spireflow

Thanks for taking the time to contribute. This project is a local-first dictation
app: the desktop app (Electron + React) talks to a Python sidecar that runs
Phonon-2.5 on the CPU. There is also a standalone OpenAI-compatible API under
`api/`.

## Development setup

Prerequisites:

- Node.js 18 or newer (CI uses 20; the project is built with Node 24)
- Python 3.10–3.14
- On Linux, install torch from the CPU wheel index first if you want to skip the
  CUDA build: `pip install --no-deps torch --index-url https://download.pytorch.org/whl/cpu`

```bash
git clone https://github.com/akshaynstack/spireflow.git
cd spireflow

npm install
npm run setup:py      # creates server/.venv and installs fermion-research
npm run dev           # Electron + React with hot reload
```

The first launch downloads the Phonon-2.5 weights (~156 MB) into
`~/.cache/fermion`. Check that the model loads and transcribes without Electron:

```bash
server/.venv/Scripts/python.exe tools/smoke_stt.py     # Windows
server/.venv/bin/python tools/smoke_stt.py             # macOS / Linux
```

## Useful commands

```bash
npm run typecheck     # TypeScript for main/preload and renderer
npm run build         # production bundle into out/
npm run build:sidecar # freeze the Python sidecar (PyInstaller)
npm run stage:model   # copy the model cache into build/fermion-cache
npm run dist:win      # build the Windows installer
npm run dist:mac      # build the macOS .dmg on macOS
```

API tests (they stub the engine and never download the model):

```bash
cd api
python -m venv .venv
.venv/Scripts/activate        # Windows; source .venv/bin/activate elsewhere
pip install -r requirements-dev.txt -r requirements.txt
pytest
```

## Pull requests

1. Fork the repository and create a topic branch
   (`feat/phonon-2.5`, `fix/overlay-focus`, …).
2. Keep the change focused. If you touch the model, the sidecar API or the
   packaging, update `README.md` and `api/README.md` in the same PR.
3. Run `npm run typecheck` and the API tests before opening the PR.
4. Describe **what** changed and **why**, and include screenshots for UI work.
5. Do not commit secrets, `.env` files, model weights, logs, or build output.

CI runs typechecking, a production build and the API test suite on every push
and pull request.

## Model and licensing

- Spireflow's source is MIT-licensed. By contributing you agree that your
  contribution is licensed under the same terms.
- Phonon-2.5 weights are **CC-BY-4.0** by Fermion Research. Keep the attribution
  in [`NOTICE`](NOTICE) intact, and update
  [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) if you add or change a
  third-party dependency.
- Do not add model weights or assets whose licence is incompatible with
  redistribution. When in doubt, open an issue first.
- To switch models, set `SPIREFLOW_MODEL` (`phonon-2.5` for the 25-language
  model, `phonon-2.5-en` for the English-only default). New model ids must exist
  in the installed `fermion-research` release; bump the pin in
  `server/requirements.txt` and `api/requirements.txt` if needed.

## Reporting bugs

Open an issue with the OS, app version, how the model was installed, and the
steps to reproduce. For security problems, follow [`SECURITY.md`](SECURITY.md)
instead of filing a public issue.

## Code style

- TypeScript: match the existing style (2-space indent, no semicolons, single
  quotes).
- Python: PEP 8, type hints where they help, and docstrings for public
  functions.
- Keep user-facing strings in English and sentence case.

By participating you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).
