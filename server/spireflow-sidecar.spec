# -*- mode: python ; coding: utf-8 -*-
"""Freeze the Spireflow speech sidecar into a standalone executable.

The resulting `server/dist/spireflow-sidecar/` folder contains its own Python
runtime, torch, the fermion native kernels and libsndfile, so the packaged app
needs nothing installed on the user's machine. PyInstaller must run on the same
OS/arch as the target (build on Windows for Windows, on macOS for macOS).
"""
import importlib.util
import os
import platform as _platform
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

# `SPECPATH` is injected by PyInstaller and points at this spec's directory.
HERE = Path(SPECPATH)  # noqa: F821

_HOST = {'Windows': 'windows', 'Darwin': 'macos', 'Linux': 'linux'}[_platform.system()]

# `fermion` ships native CPU kernels for EVERY platform under `bin/` and
# `_speech/_engine_phonon2_cpu/`. A bundled foreign binary makes PyInstaller's
# dependency analysis abort — on macOS it parses a Linux ELF as Mach-O and
# raises "Unknown Mach-O header: 0x7f454c46".
_PLATFORM_ALIASES = (
    ('macos', ('macos', 'darwin')),
    ('linux', ('linux',)),
    ('windows', ('windows', 'win-', '-win', 'win64')),
)


def _foreign_platform(name: str):
    """Platform tag of a kernel filename, or None when it is not platform-specific."""
    low = name.lower()
    for tag, aliases in _PLATFORM_ALIASES:
        if any(alias in low for alias in aliases):
            return tag
    return None


def _for_host(path: str) -> bool:
    tag = _foreign_platform(Path(path).name)
    return tag is None or tag == _HOST


def _prune_foreign_kernels() -> None:
    """Delete other platforms' kernels from the installed `fermion` package.

    Filtering the `collect_all()` result is not enough: a hook (from
    pyinstaller-hooks-contrib, or shipped inside the package itself) can gather
    the package's data wholesale and bypass `Analysis(binaries=..., datas=...)`.
    Removing the files from disk makes that impossible regardless of which code
    path collects them. Safe to run repeatedly."""
    spec = importlib.util.find_spec('fermion')
    if spec is None or not spec.submodule_search_locations:
        return
    removed = 0
    for root, _dirs, files in os.walk(spec.submodule_search_locations[0]):
        for fname in files:
            tag = _foreign_platform(fname)
            if tag is not None and tag != _HOST:
                try:
                    os.remove(os.path.join(root, fname))
                    removed += 1
                except OSError:
                    pass
    print(f'[spec] pruned {removed} non-{_HOST} fermion kernels')


_prune_foreign_kernels()


datas = []
binaries = []
hiddenimports = []

# Packages with data files or dynamic imports PyInstaller cannot see statically.
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
        if pkg == 'fermion':
            d = [(src, dst) for src, dst in d if _for_host(src)]
            b = [(src, dst) for src, dst in b if _for_host(src)]
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
