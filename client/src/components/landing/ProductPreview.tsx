import { useState, type CSSProperties } from 'react'
import { computeFunnel } from '../../lib/funnel'
import { findingKey } from '../../lib/review'
import { byPriority } from '../../lib/selectors'
import { MOCK_RESULT } from '../../mock'
import type { Finding } from '../../types'
import { KevBadge, SeverityBadge, TierBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { useOpenDemo } from './useOpenDemo'

// Everything below is derived from MOCK_RESULT (the app's illustrative demo data), never typed by hand.
const FUNNEL = computeFunnel(MOCK_RESULT.findings, {})

interface Stage {
  label: string
  note: string
  count: number
  /** Which findings belong to this stage (same predicates computeFunnel uses). */
  has: (f: Finding) => boolean
  bar: string
}

const STAGES: Stage[] = [
  { label: 'Known vulnerabilities', note: 'Exact OSV.dev match', count: FUNNEL.total, has: () => true, bar: 'var(--text-3)' },
  { label: 'In production', note: 'Not dev-only', count: FUNNEL.production, has: (f) => !f.pkg.dev, bar: 'var(--text-2)' },
  {
    label: 'Your code calls it',
    note: 'AI verdict, citation checked',
    count: FUNNEL.usesApi,
    has: (f) => f.ai?.verdict === 'USES_VULNERABLE_API',
    bar: 'var(--ai)',
  },
  { label: 'Fix now', note: 'Fixed tier rules', count: FUNNEL.fixNow, has: (f) => f.tier === 'FIX_NOW', bar: 'var(--critical)' },
]

const FIX_NOW_ROWS = 3
// Lower-tier context so the highlight has something to rule out: a High advisory the AI found no usage for
// (still Fix this sprint, since AI cannot lower a tier), a moderate one, and a Critical advisory in a dev-only package.
const CONTEXT_IDS = ['GHSA-27h2-hvpr-p74q', 'GHSA-wf5p-g6vw-rhxx', 'GHSA-xvch-5gv4-984h']

function pickRows(): Finding[] {
  const sorted = [...MOCK_RESULT.findings].sort(byPriority({}))
  const top = sorted.filter((f) => f.tier === 'FIX_NOW').slice(0, FIX_NOW_ROWS)
  const context = CONTEXT_IDS.map((id) => sorted.find((f) => f.advisory.id === id)).filter((f): f is Finding => !!f)
  return [...top, ...context]
}
const ROWS = pickRows()

export function ProductPreview() {
  const openFindings = useOpenDemo('/findings')
  const [pinned, setPinned] = useState(STAGES.length - 1)
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? pinned
  const stage = STAGES[active]!
  const inStage = ROWS.filter(stage.has).length

  return (
    <figure className="lp-preview" aria-labelledby="preview-caption">
      <div className="lp-preview__bar">
        <p className="lp-preview__title">
          <span className="eyebrow">Risk funnel</span>
          <span className="subtle num">
            {MOCK_RESULT.packageCount} packages · {FUNNEL.total} findings
          </span>
        </p>
        <span className="badge badge--accent">
          <Icon name="beaker" size={12} />
          Preview · demo data
        </span>
      </div>

      <div className="lp-preview__body">
        <div className="lp-funnel">
          <p className="lp-preview__label" id="funnel-label">
            Hover or select a stage
          </p>
          <ol className="lp-stages" aria-labelledby="funnel-label">
            {STAGES.map((s, i) => (
              <li key={s.label}>
                <button
                  type="button"
                  className="lp-stage"
                  aria-pressed={pinned === i}
                  data-active={active === i}
                  onClick={() => setPinned(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                >
                  <span className="lp-stage__n" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="lp-stage__text">
                    <span className="lp-stage__label">{s.label}</span>
                    <span className="lp-stage__note">{s.note}</span>
                  </span>
                  <span className="lp-stage__count num">{s.count}</span>
                  <span className="lp-stage__bar" aria-hidden="true">
                    <i style={{ '--w': `${Math.max((s.count / FUNNEL.total) * 100, 2)}%`, '--i': i, '--bar': s.bar } as CSSProperties} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-rows">
          <p className="lp-preview__label">Findings, in priority order</p>
          <ul className="lp-rowlist">
            {ROWS.map((f) => {
              const inside = stage.has(f)
              const first = f.reasons[0]
              return (
                <li key={findingKey(f)} className="lp-row" data-in={inside}>
                  <span className="lp-row__mark" aria-hidden="true">
                    {inside && <Icon name="check" size={10} />}
                  </span>
                  <div className="lp-row__main">
                    <div className="lp-row__head">
                      <TierBadge tier={f.tier} />
                      <span className="lp-row__pkg">
                        {f.pkg.name}@{f.pkg.version}
                      </span>
                      <SeverityBadge severity={f.advisory.severity} />
                      {f.enrichment.kev === true && <KevBadge />}
                      <VerdictBadge verdict={f.ai?.verdict ?? 'NOT_ASSESSED'} />
                    </div>
                    {first && <p className="lp-row__reason">{first}</p>}
                    <span className="sr-only">{inside ? `In stage: ${stage.label}` : `Not in stage: ${stage.label}`}</span>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="lp-preview__status" role="status">
            {inStage} of {ROWS.length} preview rows in “{stage.label}”
          </p>
        </div>
      </div>

      <figcaption className="lp-preview__foot" id="preview-caption">
        <p>
          <strong>Nothing is hidden: lower tiers stay one click away.</strong>{' '}
          <span className="muted">Showing {ROWS.length} of {FUNNEL.total} findings from illustrative demo data, not a real scan.</span>
        </p>
        <button type="button" className="btn btn--sm" onClick={openFindings}>
          Open all {FUNNEL.total} findings
          <Icon name="arrow-right" size={14} />
        </button>
      </figcaption>
    </figure>
  )
}
