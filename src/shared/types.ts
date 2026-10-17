export interface ServerStatus {
  running: boolean
  ready: boolean
  model: string | null
  device: string | null
  error: string | null
}

export interface Transcript {
  id: string
  text: string
  createdAt: string
  durationSec: number
  wordCount: number
  wpm: number
  source: 'file' | 'dictation'
  fileName?: string
}

export interface Note {
  id: string
  text: string
  createdAt: string
}

export interface HotkeyBinding {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  key: string
}

export const DEFAULT_HOTKEY: HotkeyBinding = {
  ctrl: true,
  alt: false,
  shift: false,
  meta: false,
  key: 'SPACE'
}

export interface AppSettings {
  hotwords: string[]
  notes: Note[]
  micDeviceId: string | null
  micLabel: string | null
  soundEnabled: boolean
  hotkey: HotkeyBinding
}

export interface HotkeyInfo {
  available: boolean
  active: boolean
  binding: HotkeyBinding
}

export interface BlobTranscribeResult {
  ok: boolean
  text?: string
  error?: string
  durationSec?: number
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  dataDir: string
}

export interface SidecarResult {
  text: string
  model: string
  durationSec: number
  decodeSec: number
}
