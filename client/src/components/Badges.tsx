import type { AiVerdict, Severity, Tier } from '../types'
import { formatEpss } from '../lib/format'
import { SEVERITY_LABEL, TIER_CLASS, TIER_LABEL } from '../lib/tiers'

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`badge tier-badge ${TIER_CLASS[tier]}`}>{TIER_LABEL[tier]}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge sev sev-${severity.toLowerCase()}`}>{SEVERITY_LABEL[severity]}</span>
}

export function EpssBadge({ epss }: { epss: number | null }) {
  return (
    <span className="badge neutral" title="EPSS: estimated probability of exploitation in the next 30 days">
      EPSS {formatEpss(epss)}
    </span>
  )
}

export function KevBadge() {
  return (
    <span className="badge kev" title="Listed in the CISA Known Exploited Vulnerabilities catalogue">
      KEV
    </span>
  )
}

const VERDICT_TEXT: Record<AiVerdict['verdict'], string> = {
  USES_VULNERABLE_API: 'AI: your code uses it',
  NO_VULNERABLE_USAGE_FOUND: 'AI: no usage found',
  UNCERTAIN: 'AI: uncertain',
}

const VERDICT_CLASS: Record<AiVerdict['verdict'], string> = {
  USES_VULNERABLE_API: 'v-uses',
  NO_VULNERABLE_USAGE_FOUND: 'v-none',
  UNCERTAIN: 'v-unsure',
}

export const VERDICT_LONG: Record<AiVerdict['verdict'], string> = {
  USES_VULNERABLE_API: 'Your code calls the vulnerable function',
  NO_VULNERABLE_USAGE_FOUND: 'No vulnerable usage found',
  UNCERTAIN: 'Uncertain',
}

export function VerdictBadge({ verdict }: { verdict: AiVerdict['verdict'] }) {
  return <span className={`badge verdict ${VERDICT_CLASS[verdict]}`}>{VERDICT_TEXT[verdict]}</span>
}
