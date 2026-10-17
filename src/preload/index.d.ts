import type {
  AppInfo,
  AppSettings,
  BlobTranscribeResult,
  HotkeyBinding,
  HotkeyInfo,
  Note,
  ServerStatus,
  Transcript
} from '../shared/types'

export interface TranscribeResult {
  ok: boolean
  canceled?: boolean
  entry?: Transcript
  error?: string
}

export interface SpireflowApi {
  getStatus: () => Promise<ServerStatus>
  restartServer: () => Promise<{ ok: boolean }>
  transcribeFile: () => Promise<TranscribeResult>
  transcribeBlob: (data: Uint8Array, ext: string) => Promise<BlobTranscribeResult>
  getHistory: () => Promise<Transcript[]>
  clearHistory: () => Promise<{ ok: boolean }>
  deleteEntry: (id: string) => Promise<{ ok: boolean }>

  getSettings: () => Promise<AppSettings>
  setHotwords: (words: string[]) => Promise<string[]>
  setMic: (deviceId: string | null, label: string | null) => Promise<AppSettings>
  setSound: (enabled: boolean) => Promise<AppSettings>
  setHotkey: (binding: HotkeyBinding) => Promise<AppSettings>
  addNote: (text: string) => Promise<Note>
  deleteNote: (id: string) => Promise<{ ok: boolean }>

  getHotkeyInfo: () => Promise<HotkeyInfo>
  captureHotkey: () => Promise<HotkeyBinding | null>

  getAppInfo: () => Promise<AppInfo>
  openExternal: (url: string) => Promise<{ ok: boolean }>
  openDataDir: () => Promise<{ ok: boolean }>

  onStatus: (cb: (status: ServerStatus) => void) => () => void
  onHistoryAdded: (cb: (entry: Transcript) => void) => () => void
  onNotice: (cb: (message: string) => void) => () => void
  onHotkeyState: (cb: (active: boolean) => void) => () => void
}

declare global {
  interface Window {
    spireflow: SpireflowApi
  }
}

export {}
