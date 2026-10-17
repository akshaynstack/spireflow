import { useState } from 'react'
import type { AppInfo, AppSettings, HotkeyBinding, ServerStatus } from '@shared/types'
import DiagnosticsCard from './DiagnosticsCard'
import HotkeyField from './HotkeyField'

interface SettingsViewProps {
  status: ServerStatus
  info: AppInfo | null
  settings: AppSettings
  transcriptCount: number
  hotwordCount: number
  onRestart: () => void
  onClearHistory: () => void
  onOpenDataDir: () => void
  onSetMic: (deviceId: string | null, label: string | null) => void
  onSetSound: (enabled: boolean) => void
  onSetHotkey: (binding: HotkeyBinding) => void
}

export default function SettingsView({
  status,
  info,
  settings,
  transcriptCount,
  hotwordCount,
  onRestart,
  onClearHistory,
  onOpenDataDir,
  onSetMic,
  onSetSound,
  onSetHotkey
}: SettingsViewProps) {
  const [cleared, setCleared] = useState(false)

  const modelState = status.ready
    ? `Ready \u00b7 ${status.device ?? 'CPU'}`
    : status.running
      ? 'Loading\u2026'
      : 'Offline'

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Local speech recognition and app data.</p>
      </header>

      <section className="card">
        <h3>Speech model</h3>
        <div className="field">
          <span className="field-label">Model</span>
          <span className="field-value">Phonon-2 · Fermion Research</span>
        </div>
        <div className="field">
          <span className="field-label">Status</span>
          <span className="field-value">
            <span className={`dot ${status.ready ? 'ok' : status.running ? 'warn' : 'bad'}`} />
            {modelState}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Processing</span>
          <span className="field-value">On device · nothing leaves your machine</span>
        </div>
        <div className="card-actions">
          <button className="btn-primary" onClick={onRestart}>
            Restart engine
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Dictation</h3>
        <div className="field">
          <span className="field-label">How it works</span>
          <span className="field-value">Hold anywhere, speak, release to type</span>
        </div>
        <HotkeyField binding={settings.hotkey} onSet={onSetHotkey} />
      </section>

      <DiagnosticsCard
        status={status}
        settings={settings}
        onSetMic={onSetMic}
        onSetSound={onSetSound}
      />

      <section className="card">
        <h3>Data</h3>
        <div className="field">
          <span className="field-label">Transcripts stored</span>
          <span className="field-value">{transcriptCount}</span>
        </div>
        <div className="field">
          <span className="field-label">Remembered words</span>
          <span className="field-value">{hotwordCount}</span>
        </div>
        <div className="field">
          <span className="field-label">Location</span>
          <span className="field-value mono">{info?.dataDir ?? '\u2014'}</span>
        </div>
        <div className="card-actions">
          <button className="btn-ghost" onClick={onOpenDataDir}>
            Open data folder
          </button>
          <button
            className="btn-ghost danger"
            onClick={() => {
              onClearHistory()
              setCleared(true)
            }}
            disabled={cleared || transcriptCount === 0}
          >
            {cleared ? 'History cleared' : 'Clear history'}
          </button>
        </div>
      </section>
    </div>
  )
}
