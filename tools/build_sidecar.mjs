// Freezes the Python sidecar with PyInstaller. Run on the same OS/arch as the
// target: build on Windows for the Windows installer, on macOS for the .dmg.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const isWin = process.platform === 'win32'
const venvPy = isWin
  ? join('server', '.venv', 'Scripts', 'python.exe')
  : join('server', '.venv', 'bin', 'python')
const python = existsSync(venvPy) ? venvPy : isWin ? 'python' : 'python3'

const args = [
  '-m',
  'PyInstaller',
  '--noconfirm',
  '--clean',
  '--distpath',
  'server/dist',
  '--workpath',
  'server/build',
  'server/spireflow-sidecar.spec'
]

console.log(`[sidecar] freezing with ${python}`)
const result = spawnSync(python, args, { stdio: 'inherit' })

if (result.error) {
  console.error(`[sidecar] failed to run PyInstaller: ${result.error.message}`)
  console.error('[sidecar] install it with: pip install pyinstaller')
  process.exit(1)
}

process.exit(result.status ?? 1)
