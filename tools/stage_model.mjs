// Copies the Phonon-2 model cache into build/fermion-cache so electron-builder
// can bundle it as an extraResource. The installer then works offline on a
// machine that has never seen the model.
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const cacheRoot = process.env.FERMION_CACHE_DIR ?? join(homedir(), '.cache', 'fermion')
const speechSrc = join(cacheRoot, 'speech')

if (!existsSync(speechSrc)) {
  console.error(`[model] no model cache found at ${speechSrc}`)
  console.error('[model] run the app once (or `python tools/smoke_stt.py`) to download Phonon-2 first.')
  process.exit(1)
}

const destRoot = resolve('build', 'fermion-cache')
const destSpeech = join(destRoot, 'speech')

await rm(destRoot, { recursive: true, force: true })
await mkdir(destSpeech, { recursive: true })
await cp(speechSrc, destSpeech, { recursive: true })

console.log(`[model] staged ${speechSrc} -> ${destSpeech}`)
