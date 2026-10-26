# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-10-26

### Added

- **Phonon-2.5** as the speech model — 25 languages detected automatically, a
  156 MB download (~178 MB on disk), with word-level timestamps and hotwords.
- `phonon-2.5-en` (English-only, now the desktop default), the multilingual
  `phonon-2.5`, and `phonon-2` (previous release) can all be selected through
  `SPIREFLOW_MODEL`.
- English-only model documented in the README, API docs and installer staging.
- Open-source project files: MIT `LICENSE`, model attribution in `NOTICE`, full
  third-party notices, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  issue/PR templates, `.editorconfig` and a CI workflow.
- CI now typechecks and builds the desktop app and runs the API test suite.
- The installer bundles `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md` and the
  licence texts under `resources/licenses/`.

### Fixed

- **Dictation no longer loses the start of speech.** The microphone stream is
  now opened once and kept warm for five minutes, and `MediaRecorder` starts
  before the level meter is wired up, so the first syllable is captured.
- Microphone capture is raw: echo cancellation, noise suppression and automatic
  gain are disabled and the stream is mono. The OS/browser DSP was gating and
  pumping short clips, which made the model hallucinate.

### Changed

- The desktop app now defaults to the **English-only** `phonon-2.5-en` model for
  the best English accuracy and to prevent foreign-language output on very short
  clips. Set `SPIREFLOW_MODEL=phonon-2.5` for 25-language dictation. The API
  keeps `phonon-2.5` as its default.
- `fermion-research` pin raised to `>=0.2.15,<0.3` (the first release that ships
  Phonon-2.5).
- `tools/stage_model.mjs` and the release workflow stage the configured model
  (`phonon-2.5-en` by default) instead of the whole cache, so older cached
  releases no longer inflate the installer.
- `verbose_json` now reports `language: "auto"` when the caller does not pass a
  language, matching the model's automatic detection.
- UI model labels now show the model the sidecar actually loaded.
- Version bumped to 0.3.0.

## [0.2.0] - 2026-10-17

### Added

- Hold-to-talk global hotkey, waveform overlay and paste into the focused app.
- Standalone OpenAI-compatible speech-to-text API under `api/`.
- Self-contained installers (frozen sidecar + bundled Phonon-2 weights) and a
  GitHub Releases workflow.
- History/stats dashboard, settings, dictionary (hotwords) and quick notes.
