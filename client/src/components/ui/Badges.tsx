import type { AiVerdict, Severity, Tier, UpgradePlan } from '../../types'
import { formatEpss } from '../../lib/format'
import { isEpssHigh } from '../../lib/selectors'
import { SEVERITY_LABEL, TIER_LABEL } from '../../lib/tiers'
import { SOURCE_LABEL, type ScanSource } from '../../state/store'
import { Icon } from './Icon'

const SEV_BARS: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, UNKNOWN: 0 }

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`tier tier--${tier}`}>{TIER_LABEL[tier]}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const on = SEV_BARS[severity]
  return (
    <span className={`sev sev--${severity}`}>
      <span className="sev__meter" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < on ? 'on' : ''} />
        ))}
      </span>
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

export function EpssMeter({ epss }: { epss: number | null }) {
  if (epss === null)
    return (
      <span className="epss epss--none" title="No EPSS score published for this advisory (unknown, not zero)">
        n/a
      </span>
    )
  return (
    <span
      className={`epss ${isEpssHigh(epss) ? 'epss--high' : ''}`}
      title="EPSS: estimated probability of exploitation in the next 30 days (FIRST.org)"
    >
      <span className="epss__bar" aria-hidden="true">
        <span style={{ width: `${Math.max(epss * 100, 3)}%` }} />
      </span>
      {formatEpss(epss)}
    </span>
  )
}

export function KevBadge() {
  return (
    <span className="badge badge--solid-critical" title="Listed in the CISA Known Exploited Vulnerabilities catalogue">
      <Icon name="flame" size={12} />
      KEV
    </span>
  )
}

export function ScopeBadge({ dev }: { dev: boolean }) {
  return <span className={`badge ${dev ? '' : 'badge--info'}`}>{dev ? 'Dev only' : 'Production'}</span>
}

export function DepBadge({ direct }: { direct: boolean }) {
  return <span className="badge">{direct ? 'Direct' : 'Transitive'}</span>
}

const VERDICT_TEXT: Record<AiVerdict['verdict'], string> = {
  USES_VULNERABLE_API: 'Uses vulnerable code',
  NO_VULNERABLE_USAGE_FOUND: 'No usage found',
  UNCERTAIN: 'Uncertain',
}

export const VERDICT_LONG: Record<AiVerdict['verdict'], string> = {
  USES_VULNERABLE_API: 'Your code calls the vulnerable function',
  NO_VULNERABLE_USAGE_FOUND: 'No vulnerable usage found in the code that was provided',
  UNCERTAIN: 'The code did not settle it either way',
}

/** AI verdict. Always marked as AI provenance (violet, dashed). */
export function VerdictBadge({ verdict }: { verdict: AiVerdict['verdict'] | 'NOT_ASSESSED' }) {
  if (verdict === 'NOT_ASSESSED') return <span className="badge subtle">Not assessed</span>
  const icon = verdict === 'USES_VULNERABLE_API' ? 'alert' : verdict === 'UNCERTAIN' ? 'info' : 'check'
  return (
    <span className="badge badge--ai" title={`AI assessment: ${VERDICT_LONG[verdict]}`}>
      <Icon name={icon} size={12} />
      {VERDICT_TEXT[verdict]}
    </span>
  )
}

/** Small marker for any AI-generated text block. */
export function AiTag({ children = 'AI assessment' }: { children?: string }) {
  return (
    <span className="badge badge--ai">
      <Icon name="sparkle" size={12} />
      {children}
    </span>
  )
}

/** Marker for data from an exact lookup or a server-side check (not AI). */
export function VerifiedTag({ children = 'Verified' }: { children?: string }) {
  return (
    <span className="badge badge--ok">
      <Icon name="shield-check" size={12} />
      {children}
    </span>
  )
}

export function JumpBadge({ jump }: { jump: UpgradePlan['jump'] }) {
  if (!jump) return null
  const cls = jump === 'major' ? 'badge--warn' : jump === 'minor' ? 'badge--info' : 'badge--ok'
  return (
    <span className={`badge ${cls}`} title={jump === 'major' ? 'Major version: may contain breaking changes' : undefined}>
      {jump}
    </span>
  )
}

export function SourceBadge({ source }: { source: ScanSource }) {
  const cls = source === 'demo' ? 'badge--accent' : source === 'sample' ? 'badge--info' : 'badge--ok'
  return (
    <span className={`badge ${cls}`}>
      <Icon name={source === 'demo' ? 'beaker' : source === 'sample' ? 'package' : 'activity'} size={12} />
      {SOURCE_LABEL[source]}
    </span>
  )
}
