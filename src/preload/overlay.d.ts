export interface OverlayStartPayload {
  deviceId: string | null
  soundEnabled: boolean
}

export interface SpireflowOverlayApi {
  onStart: (cb: (payload: OverlayStartPayload) => void) => () => void
  onStop: (cb: () => void) => () => void
  sendAudio: (data: Uint8Array) => void
  sendError: (message: string) => void
}

declare global {
  interface Window {
    spireflowOverlay: SpireflowOverlayApi
  }
}

export {}
