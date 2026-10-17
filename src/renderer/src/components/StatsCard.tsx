import type { Stats } from '../lib/stats'

function compact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(n)
}

export default function StatsCard({ stats }: { stats: Stats }) {
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-value">{compact(stats.totalWords)}</span>
        <span className="stat-label">total words</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.avgWpm}</span>
        <span className="stat-label">wpm</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.dayStreak}</span>
        <span className="stat-label">day streak</span>
      </div>
    </div>
  )
}
