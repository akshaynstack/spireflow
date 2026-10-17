import { useState } from 'react'
import type { Note } from '@shared/types'
import { formatClock, dayLabel } from '../lib/format'

interface NotesViewProps {
  notes: Note[]
  onAdd: (text: string) => void
  onDelete: (id: string) => void
}

export default function NotesView({ notes, onAdd, onDelete }: NotesViewProps) {
  const [draft, setDraft] = useState('')

  const submit = (): void => {
    const text = draft.trim()
    if (!text) return
    onAdd(text)
    setDraft('')
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Quick Notes</h1>
        <p className="page-sub">Jot something down without cluttering your transcript feed.</p>
      </header>

      <section className="card">
        <textarea
          className="text-area"
          placeholder="Write a note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
        />
        <div className="card-actions">
          <span className="card-note inline">Ctrl + Enter to save</span>
          <button className="btn-primary" onClick={submit} disabled={!draft.trim()}>
            Save note
          </button>
        </div>
      </section>

      {notes.length === 0 ? (
        <section className="card">
          <p className="card-note">No notes yet.</p>
        </section>
      ) : (
        notes.map((note) => (
          <article className="note" key={note.id}>
            <div className="note-head">
              <span className="note-time">
                {dayLabel(note.createdAt)} · {formatClock(note.createdAt)}
              </span>
              <button className="row-del always" title="Delete" onClick={() => onDelete(note.id)}>
                {'\u00d7'}
              </button>
            </div>
            <p className="note-text">{note.text}</p>
          </article>
        ))
      )}
    </div>
  )
}
