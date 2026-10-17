import { contextBridge, ipcRenderer } from 'electron'
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

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  getStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('server:status'),
  restartServer: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('server:restart'),
  transcribeFile: (): Promise<TranscribeResult> => ipcRenderer.invoke('transcribe:file'),
  transcribeBlob: (data: Uint8Array, ext: string): Promise<BlobTranscribeResult> =>
    ipcRenderer.invoke('transcribe:blob', data, ext),
  getHistory: (): Promise<Transcript[]> => ipcRenderer.invoke('history:get'),
  clearHistory: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('history:clear'),
  deleteEntry: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('history:delete', id),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setHotwords: (words: string[]): Promise<string[]> =>
    ipcRenderer.invoke('settings:setHotwords', words),
  setMic: (deviceId: string | null, label: string | null): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:setMic', deviceId, label),
  setSound: (enabled: boolean): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:setSound', enabled),
  setHotkey: (binding: HotkeyBinding): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:setHotkey', binding),
  addNote: (text: string): Promise<Note> => ipcRenderer.invoke('notes:add', text),
  deleteNote: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('notes:delete', id),

  getHotkeyInfo: (): Promise<HotkeyInfo> => ipcRenderer.invoke('hotkey:info'),
  captureHotkey: (): Promise<HotkeyBinding | null> => ipcRenderer.invoke('hotkey:capture'),

  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('app:info'),
  openExternal: (url: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('app:openExternal', url),
  openDataDir: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('app:openDataDir'),

  onStatus: (cb: (status: ServerStatus) => void): (() => void) =>
    subscribe('server:status', cb),
  onHistoryAdded: (cb: (entry: Transcript) => void): (() => void) =>
    subscribe('history:added', cb),
  onNotice: (cb: (message: string) => void): (() => void) => subscribe('app:notice', cb),
  onHotkeyState: (cb: (active: boolean) => void): (() => void) =>
    subscribe('hotkey:state', cb)
}

contextBridge.exposeInMainWorld('spireflow', api)

export type SpireflowApi = typeof api
