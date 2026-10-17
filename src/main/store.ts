import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import { DEFAULT_HOTKEY, type AppSettings, type HotkeyBinding, type Note } from '../shared/types'

const MAX_HOTWORDS = 25

let cache: AppSettings | null = null

function normalizeHotkey(value: unknown): HotkeyBinding {
  const candidate = value as Partial<HotkeyBinding> | undefined
  if (!candidate || typeof candidate.key !== 'string' || !candidate.key.trim()) {
    return { ...DEFAULT_HOTKEY }
  }
  return {
    ctrl: !!candidate.ctrl,
    alt: !!candidate.alt,
    shift: !!candidate.shift,
    meta: !!candidate.meta,
    key: candidate.key.trim()
  }
}

function storePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function load(): AppSettings {
  if (cache) return cache
  try {
    const raw = existsSync(storePath()) ? readFileSync(storePath(), 'utf-8') : '{}'
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    cache = {
      hotwords: Array.isArray(parsed.hotwords) ? parsed.hotwords : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      micDeviceId: typeof parsed.micDeviceId === 'string' ? parsed.micDeviceId : null,
      micLabel: typeof parsed.micLabel === 'string' ? parsed.micLabel : null,
      soundEnabled: parsed.soundEnabled !== false,
      hotkey: normalizeHotkey(parsed.hotkey)
    }
  } catch {
    cache = {
      hotwords: [],
      notes: [],
      micDeviceId: null,
      micLabel: null,
      soundEnabled: true,
      hotkey: { ...DEFAULT_HOTKEY }
    }
  }
  return cache
}

function persist(): void {
  writeFileSync(storePath(), JSON.stringify(load(), null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return load()
}

export function setHotwords(words: string[]): string[] {
  const cleaned: string[] = []
  for (const raw of words) {
    const word = raw.trim()
    if (word && !cleaned.some((w) => w.toLowerCase() === word.toLowerCase())) {
      cleaned.push(word)
    }
  }
  load().hotwords = cleaned.slice(0, MAX_HOTWORDS)
  persist()
  return load().hotwords
}

export function setMic(deviceId: string | null, label: string | null): AppSettings {
  const data = load()
  data.micDeviceId = deviceId
  data.micLabel = label
  persist()
  return data
}

export function setHotkey(binding: HotkeyBinding): AppSettings {
  const data = load()
  data.hotkey = normalizeHotkey(binding)
  persist()
  return data
}

export function setSoundEnabled(enabled: boolean): AppSettings {
  const data = load()
  data.soundEnabled = enabled
  persist()
  return data
}

export function addNote(text: string): Note {
  const note: Note = { id: randomUUID(), text: text.trim(), createdAt: new Date().toISOString() }
  load().notes.unshift(note)
  persist()
  return note
}

export function deleteNote(id: string): void {
  const data = load()
  data.notes = data.notes.filter((n) => n.id !== id)
  persist()
}
