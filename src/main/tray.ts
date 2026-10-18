import { app, Menu, Notification, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

export interface TrayHandlers {
  onShow: () => void
  onQuit: () => void
}

let tray: Tray | null = null

function trayIconPath(): string {
  const file = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'
  return join(app.getAppPath(), 'build', file)
}

function buildMenu(handlers: TrayHandlers): Menu {
  return Menu.buildFromTemplate([
    { label: 'Open Spireflow', click: handlers.onShow },
    { type: 'separator' },
    { label: 'Quit Spireflow', click: handlers.onQuit }
  ])
}

export function createTray(handlers: TrayHandlers): Tray {
  if (tray && !tray.isDestroyed()) return tray

  const image = nativeImage.createFromPath(trayIconPath())
  // macOS menu-bar icons are template images: the OS recolors them to match
  // the light/dark menu bar, so we only ship the alpha channel.
  if (process.platform === 'darwin') image.setTemplateImage(true)

  tray = new Tray(image)
  tray.setToolTip('Spireflow — hold your hotkey to dictate')
  tray.setContextMenu(buildMenu(handlers))

  // Windows/Linux: a plain left-click reopens the window (right-click opens the
  // menu). macOS shows the menu on any click, so no extra handler is needed.
  if (process.platform !== 'darwin') {
    tray.on('click', handlers.onShow)
  }

  return tray
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) tray.destroy()
  tray = null
}

/** Tells the user the app keeps running (dictation stays live) after the window closes. */
export function notifyBackground(): void {
  const title = 'Spireflow is still running'
  const body = 'Spireflow keeps listening in the background. Click the tray icon to reopen it.'

  // Windows tray balloons are the most reliable path in both dev and packaged
  // builds (toast notifications need an installed Start-menu shortcut).
  if (process.platform === 'win32' && tray && !tray.isDestroyed()) {
    tray.displayBalloon({ title, content: body, iconType: 'none' })
    return
  }

  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}
