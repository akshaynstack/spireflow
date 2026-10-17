import { useState } from 'react'

interface DictionaryViewProps {
  hotwords: string[]
  onAdd: (word: string) => void
  onRemove: (word: string) => void
}

export default function DictionaryView({ hotwords, onAdd, onRemove }: DictionaryViewProps) {
  const [draft, setDraft] = useState('')

  const submit = (): void => {
    const word = draft.trim()
    if (!word) return
    onAdd(word)
    setDraft('')
  }

  const full = hotwords.length >= 25

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Dictionary</h1>
        <p className="page-sub">
          Names, products, and jargon the model should favour when the audio is close.
        </p>
      </header>

      <section className="card">
        <h3>
          Remembered words
          <span className="card-count">
            {hotwords.length}/25
          </span>
        </h3>

        <div className="input-row">
          <input
            className="text-input"
            placeholder="e.g. Quillon, Neutrino, Ada Lovelace"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            disabled={full}
          />
          <button className="btn-primary" onClick={submit} disabled={full || !draft.trim()}>
            Add
          </button>
        </div>

        {hotwords.length === 0 ? (
          <p className="card-note">
            No words yet. Add the terms you say often — a listed word that was not said
            stays out of the transcript.
          </p>
        ) : (
          <div className="chips">
            {hotwords.map((word) => (
              <span className="chip" key={word}>
                {word}
                <button
                  className="chip-x"
                  onClick={() => onRemove(word)}
                  title={`Remove ${word}`}
                >
                  {'\u00d7'}
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
