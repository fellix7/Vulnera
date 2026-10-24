import type { CSSProperties } from 'react'
import type { FunnelCounts } from '../lib/funnel'

interface Stage {
  n: number
  title: string
  caption: string
  cls: string
}

export function Funnel({ counts, aiOff }: { counts: FunnelCounts; aiOff: boolean }) {
  const stages: Stage[] = [
    {
      n: counts.total,
      title: 'Known vulnerabilities',
      caption: 'Every advisory that matches an installed package.',
      cls: 's1',
    },
    {
      n: counts.production,
      title: 'In production code',
      caption: 'Excludes packages only used in development.',
      cls: 's2',
    },
    {
      n: counts.usesApi,
      title: 'Your code calls the vulnerable function',
      caption: aiOff ? 'AI code check did not run.' : 'AI-assessed, with file and line cited.',
      cls: 's3',
    },
    {
      n: counts.fixNow,
      title: 'Fix now',
      caption: 'Known exploited, or high risk and used by your code.',
      cls: 's4',
    },
  ]
  const max = Math.max(counts.total, 1)

  return (
    <section className="card funnel-card" aria-labelledby="funnel-h">
      <h2 id="funnel-h">From noise to a short fix list</h2>
      <ol className="funnel">
        {stages.map((s, i) => {
          const dropped = i > 0 ? stages[i - 1].n - s.n : 0
          return (
            <li
              key={s.title}
              className={`stage ${s.cls}`}
              style={{ '--ratio': Math.max(s.n / max, 0.08) } as CSSProperties}
            >
              <div className="stage-shape">
                <span className="stage-step">Step {i + 1}</span>
                <span className="stage-num">{s.n}</span>
                <span className="stage-title">{s.title}</span>
              </div>
              <p className="stage-caption">{s.caption}</p>
              {i > 0 && dropped > 0 && <p className="stage-drop">{dropped} filtered out of the previous step</p>}
              <div className="stage-bar" aria-hidden="true">
                <span />
              </div>
            </li>
          )
        })}
      </ol>
      <p className="funnel-note">Nothing is hidden — every finding is still listed below.</p>
    </section>
  )
}
