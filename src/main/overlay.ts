import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

const WIDTH = 72
const HEIGHT = 124
const MARGIN = 22

let overlayWindow: BrowserWindow | null = null

export function createOverlay(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    title: 'Spireflow',
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: false })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  overlayWindow = win
  return win
}

export function getOverlay(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null
}

/** Pins the overlay to the right edge, vertically centered on the active display. */
export function positionOverlay(): void {
  const win = getOverlay()
  if (!win) return
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const area = display.workArea
  win.setBounds({
    x: area.x + area.width - WIDTH - MARGIN,
    y: area.y + Math.round((area.height - HEIGHT) / 2),
    width: WIDTH,
    height: HEIGHT
  })
}

export function showOverlay(): void {
  const win = getOverlay() ?? createOverlay()
  positionOverlay()
  win.showInactive()
}

export function hideOverlay(): void {
  getOverlay()?.hide()
}

export function destroyOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy()
  overlayWindow = null
}
