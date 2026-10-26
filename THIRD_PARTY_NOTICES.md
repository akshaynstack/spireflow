# Third-party notices

Spireflow is MIT-licensed (see [LICENSE](LICENSE)). It depends on and
redistributes the following third-party components. This file is a summary;
where a component ships its own licence text, that text prevails.

## Speech model

| Component | Licence | Notes |
| --- | --- | --- |
| **Phonon-2.5** (Fermion Research) | **CC-BY-4.0** | Weights derived from NVIDIA Parakeet TDT 0.6B v3 (CC-BY-4.0). Attribution and changes: [NOTICE](NOTICE), [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt). |
| Phonon-2.5 English (optional) | CC-BY-4.0 | Same terms; enable with `SPIREFLOW_MODEL=phonon-2.5-en`. |

**Redistribution requirement:** when you ship Spireflow (or the model weights on
their own), keep the attribution, the licence link and the list of changes in
[NOTICE](NOTICE), and indicate if you modified the material. The CC-BY-4.0
licence permits commercial use, modification and redistribution with
attribution. It does not grant trademark rights or patent rights.

Upstream sources:

- Model page: <https://www.fermionresearch.com/models/phonon-2-5/>
- Weights: <https://huggingface.co/FermionResearch/Phonon-2.5>
- Model NOTICE: <https://huggingface.co/FermionResearch/Phonon-2.5/blob/main/NOTICE>
- Base model: <https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3>

## Runtime bundled in the frozen sidecar

| Component | Licence | Project |
| --- | --- | --- |
| fermion-research | Apache-2.0 | <https://github.com/fermionresearch/phonon> |
| PyTorch | BSD-3-Clause | <https://pytorch.org> |
| transformers | Apache-2.0 | <https://github.com/huggingface/transformers> |
| FastAPI | MIT | <https://fastapi.tiangolo.com> |
| Starlette / Uvicorn | BSD-3-Clause | <https://www.starlette.io>, <https://www.uvicorn.org> |
| pydantic | MIT | <https://docs.pydantic.dev> |
| python-multipart | Apache-2.0 | <https://github.com/Kludex/python-multipart> |
| NumPy | BSD-3-Clause | <https://numpy.org> |
| SciPy | BSD-3-Clause | <https://scipy.org> |
| soundfile | BSD-3-Clause | <https://github.com/bastibe/python-soundfile> |
| libsndfile (via soundfile) | LGPL-2.1 | <https://libsndfile.github.io/libsndfile/> |
| safetensors | Apache-2.0 | <https://github.com/huggingface/safetensors> |
| zstandard | BSD-3-Clause | <https://github.com/indygreg/python-zstandard> |
| pyinstaller (build-time, bootloader in the frozen app) | GPL-2.0-or-later with a bootloader exception | <https://pyinstaller.org> |

`LICENSES/Apache-2.0.txt` contains the Apache License, Version 2.0 text that
applies to fermion-research and the other Apache-2.0 components.

## Desktop application

| Component | Licence | Project |
| --- | --- | --- |
| Electron | MIT | <https://www.electronjs.org> |
| React / React DOM | MIT | <https://react.dev> |
| electron-vite / Vite | MIT | <https://electron-vite.org>, <https://vite.dev> |
| TypeScript | Apache-2.0 | <https://www.typescriptlang.org> |
| node-global-key-listener | MIT | <https://github.com/ntsfran/node-global-key-listener> |

## FFmpeg

The installers bundle a **static FFmpeg** binary through
[`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static). That binary is
licensed **GPL-3.0-or-later**, which is separate from Spireflow's MIT licence.

- Build used on Windows: FFmpeg 6.1.1 essentials build from
  [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), GPL v3.
- Source for that build: <https://github.com/FFmpeg/FFmpeg/commit/e38092ef93>
  and <https://ffmpeg.org/download.html>.
- Full licence text: [LICENSES/GPL-3.0.txt](LICENSES/GPL-3.0.txt).

If you redistribute a build of Spireflow, keep the FFmpeg licence and the
written offer/links needed to obtain its corresponding source, as required by
the GPL. If GPL redistribution is not acceptable for your use case, replace
`ffmpeg-static` with an FFmpeg build under a compatible licence (for example an
LGPL build configured without GPL-only components).

## Notes

- The model weights are downloaded at runtime during development, and bundled
  into the installers. They are never covered by the MIT licence.
- This file is informational and is not legal advice. Review it with counsel
  before a commercial redistribution.
