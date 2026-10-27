// Narrow-screen layout: each finding is one stacked, fully tappable row.
import { memo } from 'react'
import { Link } from '../../router'
import { EpssMeter, KevBadge, SeverityBadge, TierBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { PackageHints, TierGroupHead } from './cells'
import type { Group, Row } from './filters'

const FindingCard = memo(function FindingCard({ row }: { row: Row }) {
  const { f } = row
  return (
    <li>
      <Link to={row.href} className={`fx-card fx-row--${row.tier}`}>
        <span className="fx-card__top">
          <TierBadge tier={row.tier} />
          {row.lowered && <span className="fx-lowered">Lowered by reviewer</span>}
          {f.enrichment.kev === true && <KevBadge />}
        </span>
        <span className="fx-card__pkg">
          <span className="fx-card__name">{f.pkg.name}</span>
          <span className="fx-pkg__ver">@{f.pkg.version}</span>
          <PackageHints row={row} />
        </span>
        <span className="fx-card__sum">{f.advisory.summary}</span>
        <span className="fx-card__badges">
          <SeverityBadge severity={f.advisory.severity} />
          <EpssMeter epss={f.enrichment.epss} />
          <VerdictBadge verdict={row.ai} />
        </span>
        <span className="fx-card__meta">
          <span>{f.advisory.id}</span>
          {row.cve && <span>{row.cve}</span>}
          {row.plan?.to ? (
            <span className="fx-card__fix">
              <Icon name="arrow-right" size={11} />
              <span className="sr-only">Upgrade to </span>
              {row.plan.to}
            </span>
          ) : (
            <span className="fx-nofix">No verified fix</span>
          )}
        </span>
      </Link>
    </li>
  )
})

export function FindingsCards({ groups }: { groups: Group[] }) {
  return (
    <div className="fx-cards-wrap">
      {groups.map((g) => (
        <section key={g.tier ?? 'all'}>
          {g.tier && (
            <h3 className="fx-group-h">
              <TierGroupHead tier={g.tier} count={g.rows.length} />
            </h3>
          )}
          {g.rows.length === 0 ? (
            <p className="fx-group-empty-m">No findings in this tier.</p>
          ) : (
            <ul className="fx-cards">
              {g.rows.map((row) => (
                <FindingCard key={row.rank} row={row} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
