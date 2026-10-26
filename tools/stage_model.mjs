// Copies the Phonon-2.5 model cache into build/fermion-cache so electron-builder
// can bundle it as an extraResource. The installer then works offline on a
// machine that has never seen the model.
//
// Only the model named by SPIREFLOW_MODEL (default: phonon-2.5-en) is staged, so a
// cache that also holds older releases does not double the installer size.
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const cacheRoot = process.env.FERMION_CACHE_DIR ?? join(homedir(), '.cache', 'fermion')
const speechSrc = join(cacheRoot, 'speech')

// Model alias -> directory fermion uses in the cache (Hugging Face repo id with
// "/" replaced by "__").
const CACHE_DIRS = {
  'phonon-2.5': 'FermionResearch__Phonon-2.5',
  phonon25: 'FermionResearch__Phonon-2.5',
  'phonon-2-5': 'FermionResearch__Phonon-2.5',
  'phonon-2.5-en': 'FermionResearch__Phonon-2.5-English',
  'phonon25-en': 'FermionResearch__Phonon-2.5-English',
  'phonon-2.5-english': 'FermionResearch__Phonon-2.5-English',
  'phonon-2': 'FermionResearch__Phonon-2',
  phonon2: 'FermionResearch__Phonon-2',
  phonon: 'FermionResearch__Phonon-2',
}

if (!existsSync(speechSrc)) {
  console.error(`[model] no model cache found at ${speechSrc}`)
  console.error('[model] run the app once (or `python tools/smoke_stt.py`) to download Phonon-2.5 first.')
  process.exit(1)
}

const requested = process.env.SPIREFLOW_MODEL ?? 'phonon-2.5-en'
const modelDir = CACHE_DIRS[requested] ?? requested.replace('/', '__')
const modelSrc = join(speechSrc, modelDir)

const destRoot = resolve('build', 'fermion-cache')
const destSpeech = join(destRoot, 'speech')

await rm(destRoot, { recursive: true, force: true })
await mkdir(destSpeech, { recursive: true })

if (existsSync(modelSrc)) {
  await cp(modelSrc, join(destSpeech, modelDir), { recursive: true })
  console.log(`[model] staged ${modelSrc} -> ${join(destSpeech, modelDir)}`)
} else {
  // Unknown alias or a local model directory: stage the whole cache.
  await cp(speechSrc, destSpeech, { recursive: true })
  console.warn(`[model] '${requested}' was not found in ${speechSrc}; staged the whole cache`)
  console.log(`[model] staged ${speechSrc} -> ${destSpeech}`)
}
