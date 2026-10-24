import type { CSSProperties } from 'react'
import { computeFunnel } from '../../lib/funnel'
import { effectiveTier, findingKey, type ReviewState } from '../../lib/review'
import { aiCounts, tierCounts, vulnerablePackages } from '../../lib/selectors'
import { Link } from '../../router'
import type { Finding, ScanResult } from '../../types'
import { Icon } from '../ui/Icon'

interface Stage {
  key: string
  step: string
  /** Shown as the big number; "—" when the stage did not run. */
  value: string
  count: number
  title: string
  caption: string
  detail: string
  to: string
  color: string
  ai?: boolean
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function share(n: number, max: number): string {
  if (n === 0) return '0%'
  const pct = (n / max) * 100
  return pct < 1 ? '<1%' : `${Math.round(pct)}%`
}

function stages(findings: Finding[], review: ReviewState, aiStatus: ScanResult['aiStatus']): Stage[] {
  const c = computeFunnel(findings, review)
  const ai = aiCounts(findings)
  const tiers = tierCounts(findings, review)

  // Dev-only findings: Monitor by rule, except known-exploited ones, which stay in Fix now.
  const dev = findings.filter((f) => f.pkg.dev)
  const devMonitor = dev.filter((f) => effectiveTier(f, review[findingKey(f)]) === 'MONITOR').length
  const devOther = dev.length - devMonitor
  const devDetail =
    dev.length === 0
      ? 'No dev-only findings: everything here ships to production.'
      : [
          devMonitor > 0 ? `${devMonitor.toLocaleString()} dev-only ${plural(devMonitor, 'finding', 'findings')} moved to Monitor` : '',
          devOther > 0 ? `${devOther.toLocaleString()} dev-only ${plural(devOther, 'finding stays', 'findings stay')} higher (known exploited)` : '',
        ]
          .filter(Boolean)
          .join('; ')

  const aiRan = aiStatus === 'ok' || c.usesApi > 0
  const aiCaption =
    aiStatus === 'ok'
      ? 'AI-assessed, citations verified against your code'
      : aiStatus === 'error'
        ? 'AI code check failed'
        : 'AI code check did not run (no source folder or no API key)'
  const aiDetail = aiRan
    ? `${ai.NO_VULNERABLE_USAGE_FOUND.toLocaleString()} no usage found · ${ai.UNCERTAIN.toLocaleString()} uncertain · ${ai.NOT_ASSESSED.toLocaleString()} not assessed`
    : c.total === 0
      ? 'No findings to assess.'
      : `All ${c.total.toLocaleString()} ${plural(c.total, 'finding is', 'findings are')} not assessed (this is not the same as safe)`

  const lower = c.total - c.fixNow
  const lowerDetail =
    lower === 0
      ? 'Every finding is in Fix now.'
      : `${lower.toLocaleString()} ${plural(lower, 'finding sits', 'findings sit')} in lower tiers (${tiers.FIX_SPRINT} sprint · ${tiers.PLAN} plan · ${tiers.MONITOR} monitor)`

  return [
    {
      key: 'all',
      step: 'Stage 1',
      value: c.total.toLocaleString(),
      count: c.total,
      title: 'Known vulnerabilities',
      caption: 'Every advisory that matches an installed package version.',
      detail: `In ${vulnerablePackages(findings).toLocaleString()} vulnerable ${plural(vulnerablePackages(findings), 'package', 'packages')}`,
      to: '/findings',
      color: 'var(--neutral)',
    },
    {
      key: 'prod',
      step: 'Stage 2',
      value: c.production.toLocaleString(),
      count: c.production,
      title: 'In production code',
      caption: 'Packages that ship to production, not only used in development.',
      detail: devDetail,
      to: '/findings?scope=prod',
      color: 'var(--info)',
    },
    {
      key: 'uses',
      step: 'Stage 3',
      value: aiRan ? c.usesApi.toLocaleString() : '—',
      count: aiRan ? c.usesApi : 0,
      title: 'Your code calls the vulnerable API',
      caption: aiCaption,
      detail: aiDetail,
      to: '/findings?ai=uses',
      color: 'var(--ai)',
      ai: true,
    },
    {
      key: 'now',
      step: 'Stage 4',
      value: c.fixNow.toLocaleString(),
      count: c.fixNow,
      title: 'Fix now',
      caption: 'Known exploited, or high/critical in production with a high EPSS score or confirmed usage.',
      detail: lowerDetail,
      to: '/findings?tier=FIX_NOW',
      color: 'var(--critical)',
    },
  ]
}

/** The signature funnel: four honest stages, each linking to the matching findings. Nothing is removed. */
export function Funnel({ findings, review, aiStatus }: { findings: Finding[]; review: ReviewState; aiStatus: ScanResult['aiStatus'] }) {
  const list = stages(findings, review, aiStatus)
  const max = Math.max(list[0].count, 1)

  return (
    <section className="ov-funnel" aria-labelledby="ov-funnel-h">
      <div className="ov-section-head">
        <div>
          <span className="eyebrow">The funnel</span>
          <h2 id="ov-funnel-h">From every alert to what to fix now</h2>
        </div>
        <p className="ov-section-head__aside">Each stage opens the matching findings. Findings move between tiers; none are deleted.</p>
      </div>
      <ol className="ov-funnel__list">
        {list.map((s) => {
          const pct = s.count === 0 ? 0 : Math.max((s.count / max) * 100, 2)
          return (
            <li key={s.key}>
              <Link to={s.to} className="ov-stage" style={{ '--stage': s.color } as CSSProperties}>
                <span className="ov-stage__step eyebrow">
                  {s.step}
                  {s.ai && <span className="badge badge--ai">AI</span>}
                </span>
                <span className={`ov-stage__num num${s.key === 'now' && s.count > 0 ? ' is-hot' : ''}`}>{s.value}</span>
                <span className="ov-stage__title">{s.title}</span>
                <span className="ov-stage__caption">{s.caption}</span>
                <span className="ov-stage__foot">
                  <span className={`ov-stage__bar${s.ai ? ' is-ai' : ''}`} aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="ov-stage__pct num subtle">
                    {s.value === '—' ? 'not available' : `${share(s.count, max)} of all findings`}
                  </span>
                  <span className="ov-stage__detail">{s.detail}</span>
                  <span className="ov-stage__go">
                    View findings <Icon name="arrow-right" size={12} />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="ov-funnel__note">Nothing is hidden — every finding stays in the explorer.</p>
    </section>
  )
}
