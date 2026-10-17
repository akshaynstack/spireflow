import { execFile } from 'node:child_process'
import { clipboard } from 'electron'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sendPasteKeystroke(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      execFile(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "Add-Type -AssemblyName System.Windows.Forms;[System.Windows.Forms.SendKeys]::SendWait('^v')"
        ],
        { windowsHide: true },
        (err) => (err ? reject(err) : resolve())
      )
      return
    }

    if (process.platform === 'darwin') {
      execFile(
        'osascript',
        ['-e', 'tell application "System Events" to keystroke "v" using command down'],
        (err) => (err ? reject(err) : resolve())
      )
      return
    }

    reject(new Error('Paste is only supported on Windows and macOS'))
  })
}

/**
 * Places text on the clipboard and synthesizes a paste into whatever window
 * currently has focus. Spireflow's overlay is non-activating, so focus stays
 * on the user's app.
 */
export async function pasteText(text: string): Promise<void> {
  clipboard.writeText(text)
  await delay(90)
  await sendPasteKeystroke()
}
