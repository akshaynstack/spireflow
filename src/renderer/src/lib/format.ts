export function formatClock(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString()
  const relative = sameDay(d, today) ? 'Today' : sameDay(d, yesterday) ? 'Yesterday' : null

  const date = d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
  return relative ? `${relative} \u00b7 ${date}` : date
}
