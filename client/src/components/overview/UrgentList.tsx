import { effectiveTier, findingKey, isLowered, type ReviewState } from '../../lib/review'
import { aiState, byPriority, cveOf, explainTier, findingHref } from '../../lib/selectors'
import { Link } from '../../router'
import type { Finding } from '../../types'
import { EpssMeter, KevBadge, SeverityBadge, TierBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'

/** Top findings by the explorer's default priority order (effective tier, KEV, EPSS, severity). */
export function UrgentList({ findings, review, limit = 5 }: { findings: Finding[]; review: ReviewState; limit?: number }) {
  const top = [...findings].sort(byPriority(review)).slice(0, limit)

  return (
    <section className="ov-urgent" aria-labelledby="ov-urgent-h">
      <div className="ov-section-head ov-section-head--tight">
        <h2 id="ov-urgent-h">Most urgent</h2>
        <Link to="/findings" className="ov-more">
          View all {findings.length.toLocaleString()} <Icon name="arrow-right" size={12} />
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="ov-empty">No findings to rank. Nothing in this lockfile matched a known advisory.</p>
      ) : (
        <>
          <ol className="ov-urgent__list">
            {top.map((f) => {
              const key = findingKey(f)
              const tier = effectiveTier(f, review[key])
              const cve = cveOf(f.advisory)
              return (
                <li key={key}>
                  <Link to={findingHref(f)} className="ov-row">
                    <span className="ov-row__main">
                      <span className="ov-row__top">
                        <TierBadge tier={tier} />
                        <span className="ov-row__pkg mono truncate">
                          {f.pkg.name}
                          <span className="subtle">@{f.pkg.version}</span>
                        </span>
                      </span>
                      <span className="ov-row__id mono subtle truncate">
                        {f.advisory.id}
                        {cve && cve !== f.advisory.id ? ` · ${cve}` : ''}
                      </span>
                      <span className="ov-row__why">
                        {explainTier(f).rule}
                        {isLowered(f, review[key]) && <span className="subtle"> Lowered by your review.</span>}
                      </span>
                      <span className="ov-row__meta">
                        <SeverityBadge severity={f.advisory.severity} />
                        <EpssMeter epss={f.enrichment.epss} />
                        {f.enrichment.kev === true && <KevBadge />}
                        <VerdictBadge verdict={aiState(f)} />
                      </span>
                    </span>
                    <Icon name="chevron-right" className="ov-row__go" />
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className="ov-urgent__foot subtle">
            Ranked by tier, then known exploited, EPSS, and severity. {findings.length > top.length ? `${(findings.length - top.length).toLocaleString()} more in the explorer.` : ''}
          </p>
        </>
      )}
    </section>
  )
}
