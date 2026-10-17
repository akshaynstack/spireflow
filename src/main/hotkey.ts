import { GlobalKeyboardListener, type IGlobalKeyEvent } from 'node-global-key-listener'
import { DEFAULT_HOTKEY, type HotkeyBinding } from '../shared/types'

export interface HotkeyHandlers {
  onStart: () => void
  onStop: () => void
  onStateChange: (active: boolean) => void
}

type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta'

const MODIFIERS: Record<string, Modifier> = {
  'LEFT CTRL': 'ctrl',
  'RIGHT CTRL': 'ctrl',
  'LEFT ALT': 'alt',
  'RIGHT ALT': 'alt',
  'LEFT SHIFT': 'shift',
  'RIGHT SHIFT': 'shift',
  'LEFT META': 'meta',
  'RIGHT META': 'meta'
}

/**
 * Cross-platform push-to-talk hook. The OS hook reports raw key state, so we can
 * tell press from release (Electron's globalShortcut cannot). Events are not
 * swallowed, so the focused app still receives them. The binding is user
 * configurable and captured live from the same hook.
 */
export class Hotkey {
  private listener: GlobalKeyboardListener | null = null
  private binding: HotkeyBinding = { ...DEFAULT_HOTKEY }
  private held = { ctrl: false, alt: false, shift: false, meta: false }
  private active = false
  private disposed = false

  private capturing = false
  private captureResolve: ((binding: HotkeyBinding | null) => void) | null = null
  private captureTimer: NodeJS.Timeout | null = null

  constructor(private readonly handlers: HotkeyHandlers) {}

  async start(): Promise<void> {
    if (this.listener || this.disposed) return
    const listener = new GlobalKeyboardListener()
    this.listener = listener
    await listener.addListener((e) => this.onKey(e))
  }

  setBinding(binding: HotkeyBinding): void {
    this.binding = { ...binding }
  }

  getBinding(): HotkeyBinding {
    return { ...this.binding }
  }

  /** Resolves with the next pressed combo, or null on Escape / timeout. */
  capture(): Promise<HotkeyBinding | null> {
    return new Promise((resolve) => {
      this.captureResolve?.(null)
      this.capturing = true
      this.captureResolve = resolve
      if (this.captureTimer) clearTimeout(this.captureTimer)
      this.captureTimer = setTimeout(() => this.finishCapture(null), 15000)
    })
  }

  private finishCapture(binding: HotkeyBinding | null): void {
    if (this.captureTimer) {
      clearTimeout(this.captureTimer)
      this.captureTimer = null
    }
    this.capturing = false
    const resolve = this.captureResolve
    this.captureResolve = null
    resolve?.(binding)
  }

  private onKey(e: IGlobalKeyEvent): void {
    const name = e.name ?? ''
    if (!name) return

    const modifier = MODIFIERS[name]
    if (modifier) {
      this.held[modifier] = e.state === 'DOWN'
      return
    }

    if (name.startsWith('MOUSE')) return

    if (this.capturing) {
      if (e.state !== 'DOWN') return
      this.finishCapture(name === 'ESCAPE' ? null : { ...this.held, key: name })
      return
    }

    if (name !== this.binding.key) return

    if (e.state === 'DOWN') {
      if (this.modifiersMatch() && !this.active) {
        this.active = true
        this.handlers.onStateChange(true)
        this.handlers.onStart()
      }
    } else if (this.active) {
      this.active = false
      this.handlers.onStateChange(false)
      this.handlers.onStop()
    }
  }

  private modifiersMatch(): boolean {
    return (
      this.held.ctrl === this.binding.ctrl &&
      this.held.alt === this.binding.alt &&
      this.held.shift === this.binding.shift &&
      this.held.meta === this.binding.meta
    )
  }

  isActive(): boolean {
    return this.active
  }

  kill(): void {
    this.disposed = true
    this.finishCapture(null)
    try {
      this.listener?.kill()
    } catch {
      /* ignore */
    }
    this.listener = null
  }
}
