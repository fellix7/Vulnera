import type { CSSProperties } from 'react'
import type { ReviewState } from '../../lib/review'
import { tierCounts } from '../../lib/selectors'
import { TIER_BLURB, TIER_ORDER } from '../../lib/tiers'
import { Link } from '../../router'
import type { Finding, Tier } from '../../types'
import { TierBadge } from '../ui/Badges'

const TIER_COLOR: Record<Tier, string> = {
  FIX_NOW: 'var(--tier-now)',
  FIX_SPRINT: 'var(--tier-sprint)',
  PLAN: 'var(--tier-plan)',
  MONITOR: 'var(--tier-monitor)',
}

/** The four recommended-action tiers with counts, each linking to the filtered explorer. */
export function ActionTiers({ findings, review }: { findings: Finding[]; review: ReviewState }) {
  const counts = tierCounts(findings, review)
  const total = Math.max(findings.length, 1)

  return (
    <section aria-labelledby="ov-tiers-h">
      <div className="ov-section-head ov-section-head--tight">
        <h2 id="ov-tiers-h">By recommended action</h2>
      </div>
      <ul className="ov-tiers">
        {TIER_ORDER.map((t) => (
          <li key={t}>
            <Link to={`/findings?tier=${t}`} className="ov-tier" style={{ '--tier-c': TIER_COLOR[t] } as CSSProperties}>
              <span className="ov-tier__top">
                <TierBadge tier={t} />
                <span className="ov-tier__n num">{counts[t].toLocaleString()}</span>
              </span>
              <span className="ov-tier__blurb">{TIER_BLURB[t]}</span>
              <span className="ov-tier__bar" aria-hidden="true">
                <span style={{ width: `${counts[t] === 0 ? 0 : Math.max((counts[t] / total) * 100, 2)}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
