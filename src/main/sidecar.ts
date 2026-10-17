import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { ServerStatus } from '../shared/types'

export const SIDECAR_PORT = Number(process.env.SPIREFLOW_PORT ?? 8756)
export const SIDECAR_URL = `http://127.0.0.1:${SIDECAR_PORT}`

let child: ChildProcess | null = null
let stopping = false

/** Dev-only: the source tree + local venv live here. */
export function serverDir(): string {
  return join(app.getAppPath(), 'server')
}

/** Packaged app: the frozen sidecar shipped via electron-builder extraResources. */
function frozenSidecar(): string | null {
  const exe = process.platform === 'win32' ? 'spireflow-sidecar.exe' : 'spireflow-sidecar'
  const candidate = join(process.resourcesPath, 'sidecar', exe)
  return existsSync(candidate) ? candidate : null
}

/** Packaged app: the model weights shipped alongside the app (offline first run). */
function bundledCacheDir(): string | null {
  const dir = join(process.resourcesPath, 'fermion-cache')
  return existsSync(dir) ? dir : null
}

/** Dev-only fallback: run the sidecar from the local Python venv. */
function pickPython(): string {
  const isWin = process.platform === 'win32'
  const venv = isWin
    ? join(serverDir(), '.venv', 'Scripts', 'python.exe')
    : join(serverDir(), '.venv', 'bin', 'python')
  if (existsSync(venv)) return venv
  return isWin ? 'python' : 'python3'
}

export function startSidecar(): void {
  if (child) return
  stopping = false

  const frozen = frozenSidecar()
  const cache = bundledCacheDir()

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SPIREFLOW_PORT: String(SIDECAR_PORT),
    SPIREFLOW_LOG: join(app.getPath('userData'), 'sidecar.log')
  }

  let command: string
  let args: string[]
  let cwd: string

  if (frozen) {
    // Preferred path in a packaged app: no Python required on the user's machine.
    command = frozen
    args = []
    cwd = dirname(frozen)
  } else {
    // Dev / unpackaged: use the source script + local virtualenv.
    command = pickPython()
    args = [join(serverDir(), 'app.py')]
    cwd = serverDir()
    env.PYTHONUNBUFFERED = '1'
    env.PYTHONIOENCODING = 'utf-8'
  }

  if (cache) env.FERMION_CACHE_DIR = cache

  console.log(`[sidecar] starting: ${command} ${args.join(' ')}`)
  if (cache) console.log(`[sidecar] model cache: ${cache}`)

  child = spawn(command, args, {
    cwd,
    env,
    windowsHide: true
  })

  child.stdout?.on('data', (d) => process.stdout.write(`[sidecar] ${d}`))
  child.stderr?.on('data', (d) => process.stderr.write(`[sidecar] ${d}`))

  child.on('exit', (code) => {
    console.log(`[sidecar] exited with code ${code}`)
    child = null
    if (!stopping) {
      console.log('[sidecar] unexpected exit; will not auto-restart')
    }
  })

  child.on('error', (err) => {
    console.error('[sidecar] failed to start:', err.message)
  })
}

export function stopSidecar(): void {
  if (!child) return
  stopping = true
  child.kill()
  child = null
}

export async function fetchStatus(): Promise<ServerStatus> {
  try {
    const res = await fetch(`${SIDECAR_URL}/health`, {
      signal: AbortSignal.timeout(1500)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as Partial<ServerStatus>
    return {
      running: true,
      ready: Boolean(body.ready),
      model: body.model ?? null,
      device: body.device ?? null,
      error: body.error ?? null
    }
  } catch (err) {
    return {
      running: false,
      ready: false,
      model: null,
      device: null,
      error: child ? 'Model is loading…' : (err as Error).message
    }
  }
}
