import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, HotkeyInfo, ServerStatus } from '@shared/types'
import { formatBinding } from '../lib/hotkey'

interface MicDevice {
  id: string
  label: string
}

interface DiagnosticsCardProps {
  status: ServerStatus
  settings: AppSettings
  onSetMic: (deviceId: string | null, label: string | null) => void
  onSetSound: (enabled: boolean) => void
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const c of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function CheckRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="check-row">
      <span className={`dot ${ok ? 'ok' : 'warn'}`} />
      <span className="check-label">{label}</span>
      <span className="check-value">{value}</span>
    </div>
  )
}

type SampleState = 'idle' | 'recording' | 'working' | 'ok' | 'error'

export default function DiagnosticsCard({
  status,
  settings,
  onSetMic,
  onSetSound
}: DiagnosticsCardProps) {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [hotkeyInfo, setHotkeyInfo] = useState<HotkeyInfo | null>(null)
  const [hotkeyActive, setHotkeyActive] = useState(false)
  const [metering, setMetering] = useState(false)
  const [sampleState, setSampleState] = useState<SampleState>('idle')
  const [sampleText, setSampleText] = useState('')
  const [sampleError, setSampleError] = useState('')

  const fillRef = useRef<HTMLDivElement | null>(null)
  const meterStream = useRef<MediaStream | null>(null)
  const meterCtx = useRef<AudioContext | null>(null)
  const meterRaf = useRef(0)
  const sampleStream = useRef<MediaStream | null>(null)
  const sampleRec = useRef<MediaRecorder | null>(null)
  const sampleTimer = useRef<number | null>(null)

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    let inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audioinput'
    )
    if (inputs.length > 0 && inputs.every((d) => !d.label)) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
        probe.getTracks().forEach((t) => t.stop())
      } catch {
        /* labels stay hidden */
      }
      inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === 'audioinput'
      )
    }
    setDevices(inputs.map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })))
  }, [])

  useEffect(() => {
    void loadDevices()
    const md = navigator.mediaDevices
    md?.addEventListener?.('devicechange', loadDevices)
    window.spireflow
      .getHotkeyInfo()
      .then(setHotkeyInfo)
      .catch(() => {})
    const off = window.spireflow.onHotkeyState(setHotkeyActive)
    return () => {
      md?.removeEventListener?.('devicechange', loadDevices)
      off()
    }
  }, [loadDevices])

  const stopMeter = useCallback(() => {
    if (meterRaf.current) cancelAnimationFrame(meterRaf.current)
    meterRaf.current = 0
    meterStream.current?.getTracks().forEach((t) => t.stop())
    meterStream.current = null
    if (meterCtx.current) {
      void meterCtx.current.close().catch(() => {})
      meterCtx.current = null
    }
    if (fillRef.current) fillRef.current.style.width = '0%'
    setMetering(false)
  }, [])

  const startMeter = useCallback(async () => {
    try {
      const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true }
      if (settings.micDeviceId) audio.deviceId = { exact: settings.micDeviceId }
      const stream = await navigator.mediaDevices.getUserMedia({ audio })
      meterStream.current = stream
      const actx = new AudioContext()
      meterCtx.current = actx
      const an = actx.createAnalyser()
      an.fftSize = 512
      actx.createMediaStreamSource(stream).connect(an)
      const buffer = new Uint8Array(an.fftSize)
      setMetering(true)
      const tick = (): void => {
        meterRaf.current = requestAnimationFrame(tick)
        an.getByteTimeDomainData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) {
          const x = (buffer[i] - 128) / 128
          sum += x * x
        }
        const rms = Math.sqrt(sum / buffer.length)
        const pct = Math.min(100, Math.round(rms * 340))
        if (fillRef.current) fillRef.current.style.width = `${pct}%`
      }
      tick()
    } catch (err) {
      setSampleError(`Microphone error: ${(err as Error).message}`)
      setSampleState('error')
      stopMeter()
    }
  }, [settings.micDeviceId, stopMeter])

  const stopSample = useCallback(() => {
    if (sampleTimer.current) {
      clearTimeout(sampleTimer.current)
      sampleTimer.current = null
    }
    const rec = sampleRec.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  const startSample = useCallback(async () => {
    setSampleText('')
    setSampleError('')
    setSampleState('recording')
    try {
      const audio: MediaTrackConstraints = {}
      if (settings.micDeviceId) audio.deviceId = { exact: settings.micDeviceId }
      const stream = await navigator.mediaDevices.getUserMedia({ audio })
      sampleStream.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      sampleRec.current = rec
      const chunks: BlobPart[] = []

      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      rec.onstop = async () => {
        if (sampleTimer.current) {
          clearTimeout(sampleTimer.current)
          sampleTimer.current = null
        }
        stream.getTracks().forEach((t) => t.stop())
        sampleStream.current = null
        sampleRec.current = null
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        setSampleState('working')
        try {
          const buffer = await blob.arrayBuffer()
          const res = await window.spireflow.transcribeBlob(new Uint8Array(buffer), 'webm')
          if (res.ok) {
            setSampleText(res.text || '(no speech detected)')
            setSampleState('ok')
          } else {
            setSampleError(res.error || 'Transcription failed')
            setSampleState('error')
          }
        } catch (err) {
          setSampleError((err as Error).message)
          setSampleState('error')
        }
      }

      rec.start()
      sampleTimer.current = window.setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop()
      }, 5000)
    } catch (err) {
      setSampleError(`Microphone error: ${(err as Error).message}`)
      setSampleState('error')
    }
  }, [settings.micDeviceId])

  useEffect(
    () => () => {
      stopMeter()
      stopSample()
    },
    [stopMeter, stopSample]
  )

  const micState = settings.micLabel
    ? `Ready \u00b7 ${settings.micLabel}`
    : devices.length > 0
      ? 'Ready \u00b7 System default'
      : 'None found'

  return (
    <section className="card">
      <h3>Test &amp; diagnostics</h3>

      <div className="check-list">
        <CheckRow
          ok={status.ready}
          label="Speech engine"
          value={status.ready ? `Ready \u00b7 ${status.device ?? 'CPU'}` : status.running ? 'Loading\u2026' : 'Offline'}
        />
        <CheckRow ok={devices.length > 0} label="Microphone" value={micState} />
        <CheckRow
          ok={hotkeyInfo?.available ?? false}
          label="Push-to-talk"
          value={
            hotkeyInfo?.available
              ? hotkeyActive
                ? 'Pressed'
                : formatBinding(hotkeyInfo.binding ?? settings.hotkey)
              : 'Unavailable'
          }
        />
      </div>

      <div className="field">
        <span className="field-label">Input device</span>
        <select
          className="select"
          value={settings.micDeviceId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null
            const device = devices.find((d) => d.id === id)
            onSetMic(id, device?.label ?? null)
          }}
        >
          <option value="">System default</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="meter" aria-hidden="true">
        <div className="meter-fill" ref={fillRef} />
      </div>

      <div className="check-actions">
        <button
          className="btn-ghost"
          onClick={() => (metering ? stopMeter() : void startMeter())}
        >
          {metering ? 'Stop level test' : 'Test microphone'}
        </button>
        <button
          className="btn-ghost"
          onClick={() => (sampleState === 'recording' ? stopSample() : void startSample())}
          disabled={sampleState === 'working'}
        >
          {sampleState === 'recording'
            ? 'Stop & transcribe'
            : sampleState === 'working'
              ? 'Transcribing\u2026'
              : 'Record a sample'}
        </button>
      </div>

      {sampleState === 'ok' && <p className="test-ok">Heard: &ldquo;{sampleText}&rdquo;</p>}
      {sampleState === 'error' && <p className="test-bad">{sampleError}</p>}

      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => onSetSound(e.target.checked)}
        />
        <span>Play a tone when recording starts and stops</span>
      </label>
    </section>
  )
}
