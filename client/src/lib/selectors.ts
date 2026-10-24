// Derived views over a ScanResult, shared by every page so numbers agree everywhere.
import type { Advisory, AiVerdict, Finding, ScanResult, Severity, Tier, UpgradePlan } from '../types'
import { effectiveTier, findingKey, type ReviewState } from './review'
import { TIER_ORDER } from './tiers'

/** Same threshold as server/src/pipeline/score.ts (DEFAULT_EPSS_THRESHOLD). */
export const EPSS_THRESHOLD = 0.1

export const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']
export const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, UNKNOWN: 2, LOW: 1 }

export type AiState = AiVerdict['verdict'] | 'NOT_ASSESSED'
export const AI_STATE_LABEL: Record<AiState, string> = {
  USES_VULNERABLE_API: 'Uses vulnerable code',
  UNCERTAIN: 'Uncertain',
  NO_VULNERABLE_USAGE_FOUND: 'No usage found',
  NOT_ASSESSED: 'Not assessed',
}

export function findingHref(f: Finding): string {
  return `/finding?key=${encodeURIComponent(findingKey(f))}`
}

export function findByKey(result: ScanResult, key: string): Finding | undefined {
  return result.findings.find((f) => findingKey(f) === key)
}

export function planFor(result: ScanResult, f: Finding): UpgradePlan | undefined {
  return result.plans.find((p) => p.name === f.pkg.name && p.from === f.pkg.version)
}

/** Findings (advisories) that a plan resolves: same package name and installed version. */
export function findingsForPlan(result: ScanResult, plan: UpgradePlan): Finding[] {
  return result.findings.filter((x) => x.pkg.name === plan.name && x.pkg.version === plan.from)
}

export function aiState(f: Finding): AiState {
  return f.ai?.verdict ?? 'NOT_ASSESSED'
}

export function cveOf(a: Advisory): string | undefined {
  return a.aliases.find((x) => x.startsWith('CVE-'))
}

export function isEpssHigh(epss: number | null): boolean {
  return epss !== null && epss >= EPSS_THRESHOLD
}

export interface TierExplanation {
  rule: string // the rule that placed the finding in its tier, in plain words
  conditions: { label: string; met: boolean }[]
}

/** Mirrors tierFor() in server/src/pipeline/score.ts so the UI can show which rule fired. */
export function explainTier(f: Finding): TierExplanation {
  const sev = f.advisory.severity
  const highOrCritical = sev === 'HIGH' || sev === 'CRITICAL'
  const moderateLike = sev === 'MODERATE' || sev === 'UNKNOWN'
  const prod = !f.pkg.dev
  const epssHigh = isEpssHigh(f.enrichment.epss)
  const usesApi = f.ai?.verdict === 'USES_VULNERABLE_API'
  const kev = f.enrichment.kev === true

  const conditions = [
    { label: 'Listed in CISA KEV (exploited in the wild)', met: kev },
    { label: 'High or critical severity', met: highOrCritical },
    { label: 'Production dependency', met: prod },
    { label: `EPSS at or above ${EPSS_THRESHOLD * 100}%`, met: epssHigh },
    { label: 'AI found your code calling the vulnerable API (verified citation)', met: usesApi },
  ]

  let rule: string
  if (kev) rule = 'Known exploited (CISA KEV) always means Fix now.'
  else if (highOrCritical && prod && epssHigh) rule = 'High/critical, in production, and likely to be exploited (EPSS ≥ 10%).'
  else if (highOrCritical && prod && usesApi) rule = 'High/critical, in production, and your code calls the vulnerable API.'
  else if (prod && highOrCritical) rule = 'High/critical in production, without exploitation signals or confirmed usage.'
  else if (prod && moderateLike && epssHigh) rule = 'Moderate severity in production with elevated exploitation likelihood.'
  else if (prod) rule = 'Production dependency with lower severity and no exploitation signals.'
  else rule = 'Only used during development, so it does not ship to production.'

  return { rule, conditions }
}

export function countBy<T extends string>(items: Finding[], key: (f: Finding) => T, order: readonly T[]) {
  const out = Object.fromEntries(order.map((k) => [k, 0])) as Record<T, number>
  for (const f of items) out[key(f)] = (out[key(f)] ?? 0) + 1
  return out
}

export function tierCounts(findings: Finding[], review: ReviewState): Record<Tier, number> {
  return countBy(findings, (f) => effectiveTier(f, review[findingKey(f)]), TIER_ORDER)
}

export function severityCounts(findings: Finding[]): Record<Severity, number> {
  return countBy(findings, (f) => f.advisory.severity, SEVERITY_ORDER)
}

export function aiCounts(findings: Finding[]): Record<AiState, number> {
  return countBy(findings, aiState, ['USES_VULNERABLE_API', 'UNCERTAIN', 'NO_VULNERABLE_USAGE_FOUND', 'NOT_ASSESSED'] as const)
}

/** Unique vulnerable package@version pairs. */
export function vulnerablePackages(findings: Finding[]): number {
  return new Set(findings.map((f) => `${f.pkg.name}@${f.pkg.version}`)).size
}

/** Default priority order: effective tier, then KEV, EPSS, severity, name (matches the server's order). */
export function byPriority(review: ReviewState) {
  return (a: Finding, b: Finding) =>
    TIER_ORDER.indexOf(effectiveTier(a, review[findingKey(a)])) - TIER_ORDER.indexOf(effectiveTier(b, review[findingKey(b)])) ||
    Number(b.enrichment.kev === true) - Number(a.enrichment.kev === true) ||
    (b.enrichment.epss ?? -1) - (a.enrichment.epss ?? -1) ||
    SEVERITY_RANK[b.advisory.severity] - SEVERITY_RANK[a.advisory.severity] ||
    a.pkg.name.localeCompare(b.pkg.name) ||
    a.advisory.id.localeCompare(b.advisory.id)
}

export function formatScanTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
