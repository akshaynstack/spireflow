import type { ServerStatus } from '@shared/types'
import { KeyGlyph } from './Icons'

interface HeroProps {
  status: ServerStatus
  hotkey: string
}

function modelLabel(model: string | null): string {
  if (!model) return 'Phonon-2.5'
  if (model.includes('2.5-en') || model.endsWith('-English')) return 'Phonon-2.5 English'
  if (model.includes('2.5')) return 'Phonon-2.5'
  return model
}

export default function Hero({ status, hotkey }: HeroProps) {
  const tone = status.ready ? 'ok' : status.running ? 'warn' : 'bad'
  const label = status.ready
    ? `${modelLabel(status.model)} \u00b7 ready on ${status.device ?? 'CPU'}`
    : status.running
      ? 'Loading model\u2026'
      : 'Model offline'

  return (
    <header className="hero">
      <div className="hero-status">
        <span className={`dot ${tone}`} />
        {label}
      </div>
      <h1 className="hero-title">
        Hold{' '}
        <span className="keycap">
          <KeyGlyph />
          {hotkey}
        </span>{' '}
        in any app and start talking.
      </h1>
    </header>
  )
}
