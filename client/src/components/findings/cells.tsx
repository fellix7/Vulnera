// Small display pieces shared by the desktop table and the mobile list.
import { TIER_BLURB, TIER_LABEL } from '../../lib/tiers'
import type { Tier, UpgradePlan } from '../../types'
import { Link } from '../../router'
import { JumpBadge, KevBadge, TierBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import type { Row } from './filters'

export function PriorityCell({ row }: { row: Row }) {
  return (
    <div className="fx-prio">
      <TierBadge tier={row.tier} />
      {row.lowered && (
        <span className="fx-lowered" title={`A reviewer lowered this from ${TIER_LABEL[row.f.tier]}`}>
          <Icon name="arrow-down" size={11} />
          Lowered by reviewer
        </span>
      )}
    </div>
  )
}

/** "dev" / "transitive via x" hints. Returns null for a direct production dependency. */
export function PackageHints({ row }: { row: Row }) {
  const { pkg } = row.f
  if (!pkg.dev && pkg.direct) return null
  const chain = row.chain.join(' › ')
  const via = row.chain.length > 1 ? row.chain[0] : null
  return (
    <span className="fx-hints">
      {pkg.dev && (
        <span className="fx-hint" title="Development-only dependency">
          dev
        </span>
      )}
      {!pkg.direct && (
        <span className="fx-hint" title={`Pulled in through: ${chain}`}>
          transitive{via ? ` via ${via}` : ''}
          <span className="sr-only">, dependency chain: {chain}</span>
        </span>
      )}
    </span>
  )
}

export function PackageCell({ row }: { row: Row }) {
  const { pkg } = row.f
  return (
    <div className="fx-pkg">
      <Link to={row.href} className="fx-pkg__link" title={`${pkg.name}@${pkg.version}`}>
        <span className="fx-pkg__name">{pkg.name}</span>
        <span className="fx-pkg__ver">@{pkg.version}</span>
      </Link>
      <PackageHints row={row} />
    </div>
  )
}

export function AdvisoryCell({ row }: { row: Row }) {
  const { advisory } = row.f
  return (
    <div className="fx-adv__box">
      <span className="fx-adv__ids">
        <span className="fx-adv__ghsa">{advisory.id}</span>
        {row.cve && <span className="fx-adv__cve">{row.cve}</span>}
      </span>
      <span className="fx-adv__sum" title={advisory.summary}>
        {advisory.summary}
      </span>
    </div>
  )
}

export function KevCell({ kev }: { kev: boolean | null }) {
  if (kev === true) return <KevBadge />
  if (kev === null)
    return (
      <span className="subtle fx-kev-none" title="This advisory has no CVE alias, so the CISA KEV catalogue could not be checked">
        no CVE
      </span>
    )
  return (
    <span className="subtle">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not listed in KEV</span>
    </span>
  )
}

export function FixCell({ plan }: { plan: UpgradePlan | undefined }) {
  if (plan?.to) {
    return (
      <span className="fx-fix" title="Smallest version that clears every advisory for this package version (re-checked against OSV)">
        <span className="fx-fix__ver">
          <Icon name="arrow-right" size={12} />
          <span className="sr-only">Upgrade to </span>
          {plan.to}
        </span>
        <JumpBadge jump={plan.jump} />
      </span>
    )
  }
  return (
    <span className="fx-nofix" title="No version was verified against OSV as clearing this advisory">
      <Icon name="alert" size={12} />
      No verified fix
    </span>
  )
}

/** Header content for a tier group: marks why the findings below are ranked where they are. */
export function TierGroupHead({ tier, count }: { tier: Tier; count: number }) {
  return (
    <span className="fx-group__inner">
      <TierBadge tier={tier} />
      <span className="fx-group__count num">
        {count} {count === 1 ? 'finding' : 'findings'}
      </span>
      <span className="fx-group__blurb">{TIER_BLURB[tier]}</span>
    </span>
  )
}
