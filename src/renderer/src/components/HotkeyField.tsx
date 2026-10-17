import { useState } from 'react'
import { DEFAULT_HOTKEY, type HotkeyBinding } from '@shared/types'
import { formatBinding, hasModifier } from '../lib/hotkey'

interface HotkeyFieldProps {
  binding: HotkeyBinding
  onSet: (binding: HotkeyBinding) => void
}

export default function HotkeyField({ binding, onSet }: HotkeyFieldProps) {
  const [capturing, setCapturing] = useState(false)

  async function startCapture(): Promise<void> {
    setCapturing(true)
    try {
      const result = await window.spireflow.captureHotkey()
      if (result) onSet(result)
    } finally {
      setCapturing(false)
    }
  }

  const isDefault = formatBinding(binding) === formatBinding(DEFAULT_HOTKEY)

  return (
    <>
      <div className="field">
        <span className="field-label">Push-to-talk key</span>
        <span className="field-value">
          <span className={`keycap small${capturing ? ' capturing' : ''}`}>
            {capturing ? 'Press keys\u2026' : formatBinding(binding)}
          </span>
        </span>
      </div>

      <div className="check-actions">
        <button className="btn-ghost" onClick={() => void startCapture()} disabled={capturing}>
          {capturing ? 'Listening\u2026' : 'Change shortcut'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => onSet({ ...DEFAULT_HOTKEY })}
          disabled={capturing || isDefault}
        >
          Reset to Ctrl + Space
        </button>
      </div>

      {capturing && (
        <p className="card-note">Press the shortcut you want to use. Esc cancels.</p>
      )}
      {!capturing && !hasModifier(binding) && (
        <p className="card-note">
          Tip: include a modifier (Ctrl, Alt, Shift or Win) so the shortcut doesn&rsquo;t
          clash with normal typing.
        </p>
      )}
    </>
  )
}
