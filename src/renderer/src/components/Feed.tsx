import { useCallback, useEffect, useRef, useState } from 'react'
import type { Transcript } from '@shared/types'
import { dayKey, dayLabel, formatClock } from '../lib/format'
import { WaveIcon } from './Icons'

interface FeedProps {
  items: Transcript[]
  onDelete: (id: string) => void
}

interface Group {
  key: string
  label: string
  items: Transcript[]
}

function groupByDay(items: Transcript[]): Group[] {
  const groups: Group[] = []
  for (const t of items) {
    const key = dayKey(t.createdAt)
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, label: dayLabel(t.createdAt), items: [] }
      groups.push(group)
    }
    group.items.push(t)
  }
  return groups
}

function Row({ item, onDelete }: { item: Transcript; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  const measure = useCallback(() => {
    const el = textRef.current
    if (!el || expanded) return
    setClamped(el.scrollHeight > el.clientHeight + 1)
  }, [expanded])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return (
    <article className="row">
      <span className="row-time">{formatClock(item.createdAt)}</span>
      <span className="row-divider" />
      <div className="row-body">
        <p ref={textRef} className={`row-text${expanded ? ' expanded' : ''}`}>
          {item.text}
        </p>
        {(clamped || expanded) && (
          <button className="row-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      <button className="row-del" title="Delete" onClick={() => onDelete(item.id)}>
        {'\u00d7'}
      </button>
    </article>
  )
}

export default function Feed({ items, onDelete }: FeedProps) {
  if (items.length === 0) {
    return (
      <div className="empty">
        <WaveIcon size={28} />
        <p>No transcripts yet.</p>
        <span>Hold your dictation key, or transcribe a file, to get started.</span>
      </div>
    )
  }

  const groups = groupByDay(items)

  return (
    <div className="feed">
      {groups.map((group) => (
        <section key={group.key} className="feed-group">
          <div className="feed-heading">
            <span>{group.label}</span>
            <span className="feed-rule" />
          </div>
          {group.items.map((t) => (
            <Row key={t.id} item={t} onDelete={onDelete} />
          ))}
        </section>
      ))}
    </div>
  )
}
