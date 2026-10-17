import type { Transcript } from '@shared/types'
import { computeStats, dailyWords } from '../lib/stats'

function compact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(n)
}

export default function InsightsView({ transcripts }: { transcripts: Transcript[] }) {
  const stats = computeStats(transcripts)
  const days = dailyWords(transcripts, 14)
  const max = Math.max(1, ...days.map((d) => d.words))
  const activeDays = days.filter((d) => d.words > 0).length

  return (
    <div className="page page-wide">
      <header className="page-header">
        <h1 className="page-title">Insights</h1>
        <p className="page-sub">Your speaking habits over the last 14 days.</p>
      </header>

      <div className="metric-grid">
        <div className="metric">
          <span className="metric-value">{compact(stats.totalWords)}</span>
          <span className="metric-label">total words</span>
        </div>
        <div className="metric">
          <span className="metric-value">{stats.avgWpm}</span>
          <span className="metric-label">avg wpm</span>
        </div>
        <div className="metric">
          <span className="metric-value">{stats.sessions}</span>
          <span className="metric-label">sessions</span>
        </div>
        <div className="metric">
          <span className="metric-value">{stats.dayStreak}</span>
          <span className="metric-label">day streak</span>
        </div>
      </div>

      <section className="card">
        <h3>Words per day</h3>
        {stats.totalWords === 0 ? (
          <p className="card-note">No transcripts yet — transcribe a file to see trends.</p>
        ) : (
          <>
            <div className="chart">
              {days.map((d) => (
                <div className="chart-col" key={d.key} title={`${d.words} words`}>
                  <div
                    className={`chart-bar${d.words === 0 ? ' empty' : ''}`}
                    style={{ height: `${Math.max(3, (d.words / max) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {days.map((d) => (
                <span key={d.key}>{d.label}</span>
              ))}
            </div>
            <p className="card-note">
              Active on {activeDays} of the last 14 days · best day {compact(max)} words.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
