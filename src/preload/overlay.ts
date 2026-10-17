import { contextBridge, ipcRenderer } from 'electron'

export interface OverlayStartPayload {
  deviceId: string | null
  soundEnabled: boolean
}

const api = {
  onStart: (cb: (payload: OverlayStartPayload) => void): (() => void) => {
    const listener = (_e: unknown, payload: OverlayStartPayload): void => cb(payload)
    ipcRenderer.on('dictation:start', listener)
    return () => ipcRenderer.removeListener('dictation:start', listener)
  },
  onStop: (cb: () => void): (() => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('dictation:stop', listener)
    return () => ipcRenderer.removeListener('dictation:stop', listener)
  },
  sendAudio: (data: Uint8Array): void => ipcRenderer.send('dictation:audio', data),
  sendError: (message: string): void => ipcRenderer.send('dictation:error', message)
}

contextBridge.exposeInMainWorld('spireflowOverlay', api)

export type SpireflowOverlayApi = typeof api
