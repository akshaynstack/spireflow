import { app, shell, BrowserWindow, ipcMain, dialog, Menu, session } from 'electron'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeFile, unlink } from 'node:fs/promises'
import { startSidecar, stopSidecar, fetchStatus, SIDECAR_URL } from './sidecar'
import { prepareAudio } from './audio'
import {
  addTranscript,
  clearTranscripts,
  deleteTranscript,
  getTranscripts
} from './history'
import {
  getSettings,
  setHotwords,
  addNote,
  deleteNote,
  setMic,
  setSoundEnabled,
  setHotkey
} from './store'
import { Hotkey } from './hotkey'
import { pasteText } from './paste'
import {
  createOverlay,
  destroyOverlay,
  getOverlay,
  hideOverlay,
  showOverlay
} from './overlay'
import type {
  AppInfo,
  BlobTranscribeResult,
  HotkeyBinding,
  HotkeyInfo,
  ServerStatus,
  SidecarResult
} from '../shared/types'

app.setAppUserModelId('com.spireflow.dictation')

let mainWindow: BrowserWindow | null = null
let hotkey: Hotkey | null = null
let hotkeyAvailable = false
let dictating = false
let lastStatus: ServerStatus = {
  running: false,
  ready: false,
  model: null,
  device: null,
  error: null
}

function notify(message: string): void {
  mainWindow?.webContents.send('app:notice', message)
}

function broadcastStatus(status: ServerStatus): void {
  lastStatus = status
  mainWindow?.webContents.send('server:status', status)
}

async function pollStatus(): Promise<void> {
  const status = await fetchStatus()
  const changed =
    status.running !== lastStatus.running ||
    status.ready !== lastStatus.ready ||
    status.error !== lastStatus.error
  if (changed) broadcastStatus(status)
  lastStatus = status
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    show: false,
    backgroundColor: '#f4f1ec',
    title: 'Spireflow',
    icon: join(app.getAppPath(), 'build', 'icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f4f1ec',
      symbolColor: '#1c1b19',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.on('closed', () => {
    mainWindow = null
    destroyOverlay()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function sidecarTranscribePath(path: string, hotwords: string[]): Promise<SidecarResult> {
  const res = await fetch(`${SIDECAR_URL}/transcribe_path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, hotwords }),
    signal: AbortSignal.timeout(5 * 60 * 1000)
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Transcription failed (${res.status}): ${detail.slice(0, 300)}`)
  }
  return (await res.json()) as SidecarResult
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function startDictation(): void {
  if (!lastStatus.ready) {
    notify('Speech engine is still loading — try again in a moment.')
    return
  }
  dictating = true
  const win = getOverlay() ?? createOverlay()
  showOverlay()
  const settings = getSettings()
  win.webContents.send('dictation:start', {
    deviceId: settings.micDeviceId,
    soundEnabled: settings.soundEnabled
  })
}



function stopDictation(): void {
  if (!dictating) return
  dictating = false
  getOverlay()?.webContents.send('dictation:stop')
}

async function transcribeBlob(
  data: Uint8Array,
  ext: string,
  hotwords: string[]
): Promise<SidecarResult> {
  const tmp = join(tmpdir(), `spireflow-audio-${Date.now()}.${ext}`)
  try {
    await writeFile(tmp, Buffer.from(data))
    const audio = await prepareAudio(tmp)
    try {
      return await sidecarTranscribePath(audio.path, hotwords)
    } finally {
      await audio.cleanup()
    }
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

async function processDictation(data: Uint8Array): Promise<void> {
  try {
    const result = await transcribeBlob(data, 'webm', getSettings().hotwords)
    const text = result.text.trim()
    if (!text) {
      notify('Nothing was transcribed — check your microphone in Settings.')
      return
    }
    await pasteText(text)
    const wordCount = countWords(text)
    const entry = addTranscript({
      text,
      durationSec: result.durationSec,
      wordCount,
      wpm: result.durationSec > 0 ? Math.round((wordCount / result.durationSec) * 60) : 0,
      source: 'dictation'
    })
    mainWindow?.webContents.send('history:added', entry)
  } catch (err) {
    notify(`Dictation failed: ${(err as Error).message}`)
  }
}

function registerIpc(): void {
  ipcMain.handle('server:status', () => lastStatus)

  ipcMain.handle('server:restart', () => {
    stopSidecar()
    startSidecar()
    return { ok: true }
  })

  ipcMain.handle('transcribe:file', async () => {
    if (!mainWindow) return { ok: false, error: 'No window' }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Transcribe a file',
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio',
          extensions: [
            'wav',
            'flac',
            'ogg',
            'aiff',
            'aif',
            'mp3',
            'm4a',
            'mp4',
            'aac',
            'wma',
            'opus',
            'webm'
          ]
        },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (canceled || filePaths.length === 0) return { ok: false, canceled: true }

    const filePath = filePaths[0]
    try {
      const audio = await prepareAudio(filePath)
      try {
        const result = await sidecarTranscribePath(audio.path, getSettings().hotwords)
        const wordCount = countWords(result.text)
        const wpm = result.durationSec > 0 ? (wordCount / result.durationSec) * 60 : 0
        const entry = addTranscript({
          text: result.text,
          durationSec: result.durationSec,
          wordCount,
          wpm: Math.round(wpm),
          source: 'file',
          fileName: filePath.split(/[\\/]/).pop()
        })
        return { ok: true, entry }
      } finally {
        await audio.cleanup()
      }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('history:get', () => getTranscripts())
  ipcMain.handle('history:clear', () => {
    clearTranscripts()
    return { ok: true }
  })
  ipcMain.handle('history:delete', (_e, id: string) => {
    deleteTranscript(id)
    return { ok: true }
  })

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:setHotwords', (_e, words: string[]) => setHotwords(words))
  ipcMain.handle('settings:setMic', (_e, deviceId: string | null, label: string | null) =>
    setMic(deviceId, label)
  )
  ipcMain.handle('settings:setSound', (_e, enabled: boolean) => setSoundEnabled(enabled))
  ipcMain.handle('settings:setHotkey', (_e, binding: HotkeyBinding) => {
    const next = setHotkey(binding)
    hotkey?.setBinding(next.hotkey)
    return next
  })

  ipcMain.handle(
    'hotkey:info',
    (): HotkeyInfo => ({
      available: hotkeyAvailable,
      active: hotkey?.isActive() ?? false,
      binding: hotkey?.getBinding() ?? getSettings().hotkey
    })
  )

  ipcMain.handle('hotkey:capture', () => (hotkey ? hotkey.capture() : Promise.resolve(null)))

  ipcMain.handle(
    'transcribe:blob',
    async (_e, data: Uint8Array, ext: string): Promise<BlobTranscribeResult> => {
      try {
        const result = await transcribeBlob(data, ext || 'webm', getSettings().hotwords)
        return { ok: true, text: result.text.trim(), durationSec: result.durationSec }
      } catch (err) {
        return { ok: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.on('dictation:audio', (_e, data: Uint8Array) => {
    dictating = false
    hideOverlay()
    void processDictation(data)
  })

  ipcMain.on('dictation:error', (_e, message: string) => {
    hideOverlay()
    dictating = false
    notify(message)
  })
  ipcMain.handle('notes:add', (_e, text: string) => addNote(text))
  ipcMain.handle('notes:delete', (_e, id: string) => {
    deleteNote(id)
    return { ok: true }
  })

  ipcMain.handle('app:info', (): AppInfo => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    dataDir: app.getPath('userData')
  }))

  ipcMain.handle('app:openExternal', (_e, url: string) => {
    shell.openExternal(url)
    return { ok: true }
  })

  ipcMain.handle('app:openDataDir', () => {
    shell.openPath(app.getPath('userData'))
    return { ok: true }
  })
}

function registerPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  registerPermissions()
  registerIpc()
  startSidecar()
  createWindow()
  createOverlay()

  hotkey = new Hotkey({
    onStart: startDictation,
    onStop: stopDictation,
    onStateChange: (active) => mainWindow?.webContents.send('hotkey:state', active)
  })
  hotkey.setBinding(getSettings().hotkey)
  try {
    await hotkey.start()
    hotkeyAvailable = true
  } catch (err) {
    hotkeyAvailable = false
    notify(`Push-to-talk unavailable: ${(err as Error).message}`)
  }

  pollStatus()
  setInterval(pollStatus, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      createOverlay()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  hotkey?.kill()
  destroyOverlay()
  stopSidecar()
})
