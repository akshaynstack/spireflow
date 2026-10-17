import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import type { Transcript } from '../shared/types'

let cache: Transcript[] | null = null

function storePath(): string {
  return join(app.getPath('userData'), 'transcripts.json')
}

function load(): Transcript[] {
  if (cache) return cache
  try {
    const raw = existsSync(storePath()) ? readFileSync(storePath(), 'utf-8') : '[]'
    cache = JSON.parse(raw) as Transcript[]
  } catch {
    cache = []
  }
  return cache
}

function persist(): void {
  writeFileSync(storePath(), JSON.stringify(cache ?? [], null, 2), 'utf-8')
}

export function getTranscripts(): Transcript[] {
  return load()
}

export function addTranscript(input: Omit<Transcript, 'id' | 'createdAt'>): Transcript {
  const entry: Transcript = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  }
  const items = load()
  items.unshift(entry)
  persist()
  return entry
}

export function deleteTranscript(id: string): void {
  cache = load().filter((t) => t.id !== id)
  persist()
}

export function clearTranscripts(): void {
  cache = []
  persist()
}
