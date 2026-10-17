import type { Transcript } from '@shared/types'

export interface Stats {
  totalWords: number
  avgWpm: number
  dayStreak: number
  sessions: number
}

export function computeStats(items: Transcript[]): Stats {
  const totalWords = items.reduce((sum, t) => sum + t.wordCount, 0)

  const wpmSamples = items.filter((t) => t.wpm > 0)
  const avgWpm =
    wpmSamples.length > 0
      ? Math.round(wpmSamples.reduce((sum, t) => sum + t.wpm, 0) / wpmSamples.length)
      : 0

  const days = new Set(items.map((t) => new Date(t.createdAt).toDateString()))

  let dayStreak = 0
  const cursor = new Date()
  const has = (d: Date): boolean => days.has(d.toDateString())
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1)
  while (has(cursor)) {
    dayStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return { totalWords, avgWpm, dayStreak, sessions: items.length }
}

export interface DayBucket {
  key: string
  label: string
  words: number
}

export function dailyWords(items: Transcript[], days = 14): DayBucket[] {
  const buckets = new Map<string, number>()
  for (const t of items) {
    const key = new Date(t.createdAt).toDateString()
    buckets.set(key, (buckets.get(key) ?? 0) + t.wordCount)
  }

  const out: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({
      key: d.toDateString(),
      label: d.toLocaleDateString([], { day: 'numeric' }),
      words: buckets.get(d.toDateString()) ?? 0
    })
  }
  return out
}
