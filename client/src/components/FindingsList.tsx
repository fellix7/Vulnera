import type { Finding } from '../types'
import { effectiveTier, findingKey, isLowered, type ReviewState } from '../lib/review'
import { TIER_BLURB, TIER_CLASS, TIER_LABEL, TIER_ORDER } from '../lib/tiers'
import { EpssBadge, KevBadge, SeverityBadge, VerdictBadge } from './Badges'

interface Props {
  findings: Finding[]
  review: ReviewState
  selectedKey: string | null
  onSelect: (key: string) => void
}

export function FindingsList({ findings, review, selectedKey, onSelect }: Props) {
  return (
    <section className="card" aria-labelledby="findings-h">
      <h2 id="findings-h">Findings by priority</h2>
      {TIER_ORDER.map((tier) => {
        const items = findings
          .map((f, i) => ({ f, i, key: findingKey(f), lowered: isLowered(f, review[findingKey(f)]) }))
          .filter((x) => effectiveTier(x.f, review[x.key]) === tier)
          .sort((a, b) => Number(a.lowered) - Number(b.lowered) || a.i - b.i)
        return (
          <div key={tier} className={`tier-group ${TIER_CLASS[tier]}`}>
            <h3 className="tier-head">
              <span className="tier-name">{TIER_LABEL[tier]}</span>
              <span className="tier-count" aria-label={`${items.length} findings`}>
                {items.length}
              </span>
              <span className="tier-blurb">{TIER_BLURB[tier]}</span>
            </h3>
            {items.length === 0 ? (
              <p className="empty">No findings in this tier.</p>
            ) : (
              <ul className="rows">
                {items.map(({ f, key, lowered }) => (
                  <li key={key}>
                    <button
                      type="button"
                      className={`row ${selectedKey === key ? 'selected' : ''}`}
                      onClick={() => onSelect(key)}
                      aria-haspopup="dialog"
                    >
                      <span className="row-main">
                        <span className="row-pkg">
                          {f.pkg.name}
                          <span className="ver">@{f.pkg.version}</span>
                          {f.pkg.dev && <span className="mini">dev</span>}
                          {!f.pkg.direct && <span className="mini">transitive</span>}
                        </span>
                        <span className="row-id">{f.advisory.id}</span>
                      </span>
                      <span className="row-summary">{f.advisory.summary}</span>
                      <span className="row-badges">
                        <SeverityBadge severity={f.advisory.severity} />
                        <EpssBadge epss={f.enrichment.epss} />
                        {f.enrichment.kev === true && <KevBadge />}
                        {f.ai && <VerdictBadge verdict={f.ai.verdict} />}
                        {lowered && <span className="badge lowered">Lowered by reviewer</span>}
                      </span>
                      {f.reasons.length > 0 && (
                        <span className="chips">
                          {f.reasons.map((r, i) => (
                            <span key={i} className="chip">
                              {r}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}
