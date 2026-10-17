import type { ServerStatus } from '@shared/types'
import { KeyGlyph } from './Icons'

interface HeroProps {
  status: ServerStatus
  hotkey: string
}

export default function Hero({ status, hotkey }: HeroProps) {
  const tone = status.ready ? 'ok' : status.running ? 'warn' : 'bad'
  const label = status.ready
    ? `Phonon-2 \u00b7 ready on ${status.device ?? 'CPU'}`
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
