import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_HOTKEY, type AppInfo, type AppSettings, type HotkeyBinding, type ServerStatus, type Transcript } from '@shared/types'
import Sidebar, { type View } from './components/Sidebar'
import Hero from './components/Hero'
import Feed from './components/Feed'
import StatsCard from './components/StatsCard'
import SettingsView from './components/SettingsView'
import AboutView from './components/AboutView'
import InsightsView from './components/InsightsView'
import DictionaryView from './components/DictionaryView'
import NotesView from './components/NotesView'
import { WaveIcon, SidebarIcon } from './components/Icons'
import { computeStats } from './lib/stats'
import { formatBinding } from './lib/hotkey'

const OFFLINE: ServerStatus = {
  running: false,
  ready: false,
  model: null,
  device: null,
  error: null
}

const DEFAULT_SETTINGS: AppSettings = {
  hotwords: [],
  notes: [],
  micDeviceId: null,
  micLabel: null,
  soundEnabled: true,
  hotkey: { ...DEFAULT_HOTKEY }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [status, setStatus] = useState<ServerStatus>(OFFLINE)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    window.spireflow.getStatus().then(setStatus)
    window.spireflow.getHistory().then(setTranscripts)
    window.spireflow.getSettings().then(setSettings)
    window.spireflow.getAppInfo().then(setInfo)
    const offStatus = window.spireflow.onStatus(setStatus)
    const offNotice = window.spireflow.onNotice(setNotice)
    const offAdded = window.spireflow.onHistoryAdded((entry) =>
      setTranscripts((prev) => [entry, ...prev])
    )
    return () => {
      offStatus()
      offNotice()
      offAdded()
    }
  }, [])

  const stats = useMemo(() => computeStats(transcripts), [transcripts])
  const hotkeyLabel = useMemo(() => formatBinding(settings.hotkey), [settings.hotkey])

  const handleTranscribeFile = useCallback(async () => {
    setBusy(true)
    setNotice(null)
    try {
      const res = await window.spireflow.transcribeFile()
      if (res.ok && res.entry) {
        setTranscripts((prev) => [res.entry as Transcript, ...prev])
        setView('home')
      } else if (res.error) {
        setNotice(res.error)
      }
    } catch (err) {
      setNotice((err as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await window.spireflow.deleteEntry(id)
    setTranscripts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleClearHistory = useCallback(async () => {
    await window.spireflow.clearHistory()
    setTranscripts([])
  }, [])

  const handleAddHotword = useCallback(
    async (word: string) => {
      const next = await window.spireflow.setHotwords([...settings.hotwords, word])
      setSettings((s) => ({ ...s, hotwords: next }))
    },
    [settings.hotwords]
  )

  const handleRemoveHotword = useCallback(
    async (word: string) => {
      const next = await window.spireflow.setHotwords(
        settings.hotwords.filter((w) => w !== word)
      )
      setSettings((s) => ({ ...s, hotwords: next }))
    },
    [settings.hotwords]
  )

  const handleSetMic = useCallback(async (deviceId: string | null, label: string | null) => {
    const next = await window.spireflow.setMic(deviceId, label)
    setSettings(next)
  }, [])

  const handleSetSound = useCallback(async (enabled: boolean) => {
    const next = await window.spireflow.setSound(enabled)
    setSettings(next)
  }, [])

  const handleSetHotkey = useCallback(async (binding: HotkeyBinding) => {
    const next = await window.spireflow.setHotkey(binding)
    setSettings(next)
  }, [])

  const handleAddNote = useCallback(async (text: string) => {
    const note = await window.spireflow.addNote(text)
    setSettings((s) => ({ ...s, notes: [note, ...s.notes] }))
  }, [])

  const handleDeleteNote = useCallback(async (id: string) => {
    await window.spireflow.deleteNote(id)
    setSettings((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }))
  }, [])

  const content = (() => {
    switch (view) {
      case 'notes':
        return (
          <NotesView
            notes={settings.notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
        )
      case 'insights':
        return <InsightsView transcripts={transcripts} />
      case 'dictionary':
        return (
          <DictionaryView
            hotwords={settings.hotwords}
            onAdd={handleAddHotword}
            onRemove={handleRemoveHotword}
          />
        )
      case 'settings':
        return (
          <SettingsView
            status={status}
            info={info}
            settings={settings}
            transcriptCount={transcripts.length}
            hotwordCount={settings.hotwords.length}
            onRestart={() => window.spireflow.restartServer()}
            onClearHistory={handleClearHistory}
            onOpenDataDir={() => window.spireflow.openDataDir()}
            onSetMic={handleSetMic}
            onSetSound={handleSetSound}
            onSetHotkey={handleSetHotkey}
          />
        )
      case 'about':
        return <AboutView info={info} onOpen={(url) => window.spireflow.openExternal(url)} />
      case 'transcribe':
        return (
          <div className="placeholder">
            <WaveIcon size={30} />
            <h2>Transcribe a File</h2>
            <p>Supports wav, flac, ogg, aiff, mp3, m4a and more at any sample rate.</p>
            <button className="btn-primary" onClick={handleTranscribeFile} disabled={busy}>
              {busy ? 'Transcribing…' : 'Choose audio file'}
            </button>
          </div>
        )
      default:
        return (
          <div className="content">
            <Feed items={transcripts} onDelete={handleDelete} />
            <StatsCard stats={stats} />
          </div>
        )
    }
  })()

  return (
    <div className="app">
      <div className="titlebar">
        <button
          className="titlebar-btn no-drag"
          onClick={() => setSidebarOpen((open) => !open)}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <SidebarIcon />
        </button>
        <span className="titlebar-title">Spireflow</span>
      </div>

      <div className="shell">
        <Sidebar
          view={view}
          onView={setView}
          onTranscribeFile={handleTranscribeFile}
          busy={busy}
          collapsed={!sidebarOpen}
        />

        <main className="main">
          <div className="panel">
            <Hero status={status} hotkey={hotkeyLabel} />

            <div className="panel-scroll">
              {!status.ready && status.error && (
                <div className="banner">
                  <span>{status.error}</span>
                  <button onClick={() => window.spireflow.restartServer()}>Retry</button>
                </div>
              )}
              {notice && <div className="banner warn">{notice}</div>}

              {content}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
