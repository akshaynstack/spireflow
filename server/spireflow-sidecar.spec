# -*- mode: python ; coding: utf-8 -*-
"""Freeze the Spireflow speech sidecar into a standalone executable.

The resulting `server/dist/spireflow-sidecar/` folder contains its own Python
runtime, torch, the fermion native kernels and libsndfile, so the packaged app
needs nothing installed on the user's machine. PyInstaller must run on the same
OS/arch as the target (build on Windows for Windows, on macOS for macOS).
"""
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

# `SPECPATH` is injected by PyInstaller and points at this spec's directory.
HERE = Path(SPECPATH)  # noqa: F821

datas = []
binaries = []
hiddenimports = []

# Packages with data files or dynamic imports PyInstaller cannot see statically.
# `fermion` ships the native CPU kernels under `bin/` and `_speech/_engine_phonon2_cpu/`.
for pkg in [
    'fermion',
    'soundfile',
    '_soundfile_data',
    'fastapi',
    'starlette',
    'uvicorn',
    'anyio',
    'pydantic',
    'multipart',
    'safetensors',
    'zstandard',
]:
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception as exc:  # noqa: BLE001
        print(f'[spec] collect_all({pkg}) failed: {exc}')

# transformers (and fermion's engines) are imported lazily at runtime.
hiddenimports += collect_submodules('transformers')
hiddenimports += collect_submodules('fermion')
hiddenimports += [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'encodings.idna',
]

a = Analysis(
    [str(HERE / 'app.py')],
    pathex=[str(HERE)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    # Only trim packages the sidecar never touches. torch submodules such as
    # `torch.distributed` are imported dynamically deep inside torch/transformers
    # and must NOT be excluded or the frozen model load fails.
    excludes=[
        'tkinter',
        'matplotlib',
        'IPython',
        'pytest',
        'torchvision',
        'torchaudio',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='spireflow-sidecar',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name='spireflow-sidecar',
)
