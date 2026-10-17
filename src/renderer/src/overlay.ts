import './overlay.css'

interface OverlayStartPayload {
  deviceId: string | null
  soundEnabled: boolean
}

const api = window.spireflowOverlay
const canvas = document.getElementById('wave') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

const BARS = 19
const HALF = Math.ceil(BARS / 2)
const CENTER = (BARS - 1) / 2

let stream: MediaStream | null = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let data: Uint8Array<ArrayBuffer> | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let raf = 0
let live = false
let soundOn = true

function resize(): void {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(rect.width * dpr))
  canvas.height = Math.max(1, Math.round(rect.height * dpr))
}

function bandLevels(data_: Uint8Array<ArrayBuffer>, count: number): Float32Array {
  const out = new Float32Array(count)
  const usable = Math.floor(data_.length * 0.6)
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i / count) * usable)
    const end = Math.max(start + 1, Math.floor(((i + 1) / count) * usable))
    let sum = 0
    for (let j = start; j < end; j++) sum += data_[j]
    const avg = sum / (end - start) / 255
    out[i] = Math.min(1, Math.pow(avg, 1.3) * 2.1)
  }
  return out
}

function draw(levels: Float32Array | null, t: number): void {
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  // Vertical waveform, mirrored about the middle: the lowest bands sit at the
  // vertical center and the wave spreads outward toward both ends.
  const gap = Math.max(2, Math.round(h * 0.02))
  const barH = (h - gap * (BARS - 1)) / BARS
  const radius = barH / 2

  for (let i = 0; i < BARS; i++) {
    const slot = Math.min(HALF - 1, Math.round(Math.abs(i - CENTER)))
    const v = levels ? levels[slot] : 0.1 + 0.05 * Math.abs(Math.sin(t / 430 + slot * 0.7))
    const bw = Math.max(barH, v * w * 0.96)
    const y = i * (barH + gap)
    const x = (w - bw) / 2
    ctx.beginPath()
    ctx.roundRect(x, y, bw, barH, radius)
    ctx.fillStyle = `rgba(248, 238, 220, ${0.5 + 0.5 * Math.min(1, v * 1.3)})`
    ctx.shadowColor = 'rgba(226, 178, 102, 0.45)'
    ctx.shadowBlur = 6 * Math.min(1, v * 1.6)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

function loop(t: number): void {
  raf = requestAnimationFrame(loop)
  let levels: Float32Array | null = null
  if (analyser && data) {
    analyser.getByteFrequencyData(data)
    levels = bandLevels(data, HALF)
  }
  draw(levels, t)
}

function blip(freq: number, at: number, dur: number, peak: number): void {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.linearRampToValueAtTime(peak, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(at)
  osc.stop(at + dur + 0.03)
}

function tone(kind: 'start' | 'stop'): void {
  if (!audioCtx || !soundOn) return
  const now = audioCtx.currentTime
  if (kind === 'start') {
    blip(680, now, 0.09, 0.05)
    blip(1020, now + 0.075, 0.09, 0.045)
  } else {
    blip(520, now, 0.13, 0.05)
  }
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function releaseMedia(): void {
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  analyser = null
  data = null
  if (audioCtx) {
    void audioCtx.close().catch(() => {})
    audioCtx = null
  }
  recorder = null
  chunks = []
  document.body.classList.remove('recording')
}

async function start(payload: OverlayStartPayload): Promise<void> {
  if (live) return
  if (!navigator.mediaDevices?.getUserMedia) {
    api.sendError('Microphone access is unavailable in this build.')
    return
  }

  live = true
  soundOn = payload.soundEnabled
  resize()
  document.body.classList.add('recording')
  if (!raf) raf = requestAnimationFrame(loop)

  const audio: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true
  }
  if (payload.deviceId) audio.deviceId = { exact: payload.deviceId }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio })
  } catch (err) {
    live = false
    releaseMedia()
    api.sendError(`Microphone error: ${(err as Error).message}`)
    return
  }

  if (!live) {
    releaseMedia()
    return
  }

  audioCtx = new AudioContext()
  await audioCtx.resume().catch(() => {})
  const source = audioCtx.createMediaStreamSource(stream)
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.75
  source.connect(analyser)
  data = new Uint8Array(analyser.frequencyBinCount)

  tone('start')

  chunks = []
  const mime = pickMime()
  recorder = new MediaRecorder(
    stream,
    mime ? { mimeType: mime, audioBitsPerSecond: 128000 } : undefined
  )
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.onstop = () => {
    void finish()
  }
  recorder.start(120)
}

function stop(): void {
  if (!live) return
  live = false
  tone('stop')
  try {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  } catch {
    releaseMedia()
  }
}

async function finish(): Promise<void> {
  const mime = recorder?.mimeType || 'audio/webm'
  const blob = new Blob(chunks, { type: mime })
  releaseMedia()

  if (blob.size < 1400) {
    api.sendError('Recording was too short — hold the shortcut while you speak.')
    return
  }

  const buffer = await blob.arrayBuffer()
  api.sendAudio(new Uint8Array(buffer))
}

api.onStart((payload) => {
  void start(payload)
})
api.onStop(() => stop())

window.addEventListener('resize', resize)
resize()
raf = requestAnimationFrame(loop)
