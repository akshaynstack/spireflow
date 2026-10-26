import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { tmpdir } from 'node:os'
import ffmpegStatic from 'ffmpeg-static'

const execFileP = promisify(execFile)

// In a packaged build the binary is unpacked next to app.asar, so the path
// returned from inside the archive has to be rewritten.
const ffmpegPath = ffmpegStatic
  ? ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
  : null

/** Formats Phonon-2.5 reads directly (via libsndfile). Everything else goes through ffmpeg. */
const NATIVE_EXT = new Set(['.wav', '.flac', '.ogg', '.aiff', '.aif'])

export interface PreparedAudio {
  path: string
  cleanup: () => Promise<void>
}

/**
 * Returns a 16 kHz mono wav path the sidecar can read. Native formats pass
 * through untouched; mp3, m4a, and friends are transcoded with bundled ffmpeg.
 */
export async function prepareAudio(filePath: string): Promise<PreparedAudio> {
  const ext = extname(filePath).toLowerCase()

  if (NATIVE_EXT.has(ext)) {
    return { path: filePath, cleanup: async () => {} }
  }

  if (!ffmpegPath) {
    throw new Error(`Cannot read ${ext || 'this'} files: ffmpeg is not available`)
  }

  const out = join(
    tmpdir(),
    `spireflow-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
  )

  try {
    await execFileP(
      ffmpegPath,
      ['-y', '-i', filePath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'wav', out],
      { maxBuffer: 1024 * 1024 * 64 }
    )
  } catch (err) {
    const detail = (err as { stderr?: string }).stderr ?? (err as Error).message
    throw new Error(`Could not decode ${ext} file: ${detail.toString().slice(-400)}`)
  }

  return {
    path: out,
    cleanup: async () => {
      await unlink(out).catch(() => {})
    }
  }
}
