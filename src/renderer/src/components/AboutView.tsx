import type { AppInfo } from '@shared/types'
import { BrandMark } from './Icons'

interface AboutViewProps {
  info: AppInfo | null
  onOpen: (url: string) => void
}

const MODEL_URL = 'https://www.fermionresearch.com/models/phonon-2-5/'
const DOCS_URL = 'https://www.fermionresearch.com/docs/speech/'
const WEIGHTS_URL = 'https://huggingface.co/FermionResearch/Phonon-2.5'

export default function AboutView({ info, onOpen }: AboutViewProps) {
  return (
    <div className="page">
      <header className="about-head">
        <span className="about-mark">
          <BrandMark size={30} />
        </span>
        <div>
          <h1 className="page-title">Spireflow</h1>
          <p className="page-sub">Local dictation · v{info?.version ?? '0.3.0'}</p>
        </div>
      </header>

      <section className="card">
        <h3>About</h3>
        <p className="card-body">
          Hold a key, speak, and your words appear in any app. Speech recognition runs
          entirely on your machine — no cloud, no account, no audio leaving the device.
        </p>
      </section>

      <section className="card">
        <h3>Speech recognition</h3>
        <div className="field">
          <span className="field-label">Model</span>
          <span className="field-value">Phonon-2.5 English</span>
        </div>
        <div className="field">
          <span className="field-label">Languages</span>
          <span className="field-value">English · 25 with the multilingual model</span>
        </div>
        <div className="field">
          <span className="field-label">Author</span>
          <span className="field-value">Fermion Research</span>
        </div>
        <div className="field">
          <span className="field-label">License</span>
          <span className="field-value">CC-BY-4.0</span>
        </div>
        <p className="card-note">
          The Phonon-2.5 weights are released under CC-BY-4.0 and are a derivative of
          NVIDIA Parakeet TDT 0.6B v3. Attribution and the list of changes live in
          NOTICE at the root of the repository.
        </p>
        <div className="card-actions">
          <button className="btn-ghost" onClick={() => onOpen(MODEL_URL)}>
            Model page
          </button>
          <button className="btn-ghost" onClick={() => onOpen(WEIGHTS_URL)}>
            Weights
          </button>
          <button className="btn-ghost" onClick={() => onOpen(DOCS_URL)}>
            Docs
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Built with</h3>
        <div className="field">
          <span className="field-label">Electron</span>
          <span className="field-value mono">{info?.electron ?? '\u2014'}</span>
        </div>
        <div className="field">
          <span className="field-label">Chromium</span>
          <span className="field-value mono">{info?.chrome ?? '\u2014'}</span>
        </div>
        <div className="field">
          <span className="field-label">Node</span>
          <span className="field-value mono">{info?.node ?? '\u2014'}</span>
        </div>
      </section>
    </div>
  )
}
