import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'

interface Stage {
  key: string
  label: string
  hint: string
  ai?: boolean
  /** Seconds after the request starts at which this stage is shown as active. An estimate, not a server signal. */
  at: number
}

function stagesFor(withAi: boolean): Stage[] {
  const base: Stage[] = [
    { key: 'read', label: 'Reading lockfile', hint: 'Building the list of installed packages', at: 0 },
    { key: 'osv', label: 'Matching against OSV.dev', hint: 'Exact name and version lookup', at: 1.5 },
    { key: 'enrich', label: 'Enriching with EPSS & CISA KEV', hint: 'Exploitation likelihood and known-exploited flags', at: 7 },
    { key: 'rank', label: 'Ranking into tiers', hint: 'Fixed, published rules', at: 12 },
  ]
  if (withAi) {
    base.push({ key: 'ai', label: 'AI code check', hint: 'Gemini reads short snippets; citations are verified afterwards', ai: true, at: 15 })
  }
  base.push({ key: 'verify', label: 'Verifying minimum safe versions', hint: 'Each upgrade target is re-checked against OSV', at: withAi ? 45 : 16 })
  return base
}

function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

/**
 * Staged progress for a running scan. The server sends no progress events, so stages advance on a timer.
 * The last stage never completes here: the page leaves this view when the request resolves.
 */
export function ScanProgress({ withAi, startedAt, label }: { withAi: boolean; startedAt: number; label: string }) {
  const elapsed = useElapsed(startedAt)
  const stages = stagesFor(withAi)
  let active = 0
  stages.forEach((s, i) => {
    if (elapsed >= s.at) active = i
  })
  const current = stages[active]

  return (
    <section className="scan-progress" aria-labelledby="scan-progress-h" aria-busy="true">
      <div className="scan-progress__head">
        <div className="scan-progress__title">
          <span className="eyebrow">Scanning</span>
          <h2 id="scan-progress-h" className="truncate" title={label}>
            {label}
          </h2>
        </div>
        <div className="scan-progress__time" aria-hidden="true">
          <span className="num">{elapsed}</span>
          <span className="subtle">s elapsed</span>
        </div>
      </div>

      <p className="scan-progress__now" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>
          Step {active + 1} of {stages.length}: {current.label}…
        </span>
      </p>

      <ol className="scan-stages">
        {stages.map((s, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending'
          return (
            <li key={s.key} className={`scan-stage scan-stage--${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="scan-stage__mark" aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={12} /> : state === 'active' ? <span className="spinner" /> : null}
              </span>
              <span className="scan-stage__text">
                <span className="scan-stage__label">
                  {s.label}
                  {s.ai && <span className="badge badge--ai">AI</span>}
                  <span className="sr-only">{state === 'done' ? ' (done)' : state === 'active' ? ' (in progress)' : ' (waiting)'}</span>
                </span>
                {state !== 'pending' && <span className="scan-stage__hint subtle">{s.hint}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="scan-progress__note subtle">
        {elapsed > 60
          ? 'Still working. Large lockfiles and the AI step can take more than a minute; the result appears here as soon as the server answers.'
          : 'Typical scan: 5–60 s. The server does not report progress, so these steps are an estimate; the last one stays active until the server answers.'}
      </p>
    </section>
  )
}
