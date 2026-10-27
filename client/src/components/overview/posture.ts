import type { Finding, Tier } from '../../types'
import { findingKey, isLowered, effectiveTier, type ReviewState } from '../../lib/review'
import { tierCounts, vulnerablePackages } from '../../lib/selectors'
import { TIER_LABEL } from '../../lib/tiers'

export interface Posture {
  tone: 'critical' | 'high' | 'ok'
  headline: string
  detail: string
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** One-sentence risk posture, computed only from the scan and the person's own review changes. */
export function computePosture(findings: Finding[], review: ReviewState, packageCount: number): Posture {
  const total = findings.length
  if (total === 0) {
    return {
      tone: 'ok',
      headline: `No known vulnerabilities matched the ${packageCount.toLocaleString()} packages in this scan.`,
      detail: 'Matching is an exact OSV.dev lookup by package name and version, so this covers published advisories only.',
    }
  }

  const tiers = tierCounts(findings, review)
  const now = findings.filter((f) => effectiveTier(f, review[findingKey(f)]) === 'FIX_NOW')
  const kev = now.filter((f) => f.enrichment.kev === true).length
  const uses = now.filter((f) => f.ai?.verdict === 'USES_VULNERABLE_API').length
  const lowered = findings.filter((f) => isLowered(f, review[findingKey(f)])).length
  const rest = (['FIX_SPRINT', 'PLAN', 'MONITOR'] as Tier[])
    .filter((t) => tiers[t] > 0)
    .map((t) => `${tiers[t].toLocaleString()} ${TIER_LABEL[t].toLowerCase()}`)

  const pkgs = vulnerablePackages(findings)
  const scope = `${total.toLocaleString()} ${plural(total, 'finding', 'findings')} in ${pkgs.toLocaleString()} vulnerable ${plural(pkgs, 'package', 'packages')} out of ${packageCount.toLocaleString()} inspected.`
  const reviewNote = lowered > 0 ? ` Tiers include ${lowered} ${plural(lowered, 'finding', 'findings')} you lowered in review.` : ''

  if (now.length === 0) {
    const sprint = tiers.FIX_SPRINT
    return {
      tone: sprint > 0 ? 'high' : 'ok',
      headline:
        sprint > 0
          ? `Nothing is urgent right now, but ${sprint.toLocaleString()} ${plural(sprint, 'finding should', 'findings should')} be fixed this sprint.`
          : 'Nothing needs action right now.',
      detail: `${scope} ${rest.length ? `By tier: ${rest.join(', ')}.` : ''}${reviewNote}`.trim(),
    }
  }

  const parts: string[] = []
  if (kev > 0) parts.push(`${kev} ${plural(kev, 'is', 'are')} known exploited (CISA KEV)`)
  if (uses > 0) parts.push(`in ${uses}, your code calls the vulnerable function (AI-assessed)`)
  const n = now.length
  const base = `${n.toLocaleString()} ${plural(n, 'finding needs', 'findings need')} action now`
  return {
    tone: 'critical',
    headline: parts.length ? `${base} — ${parts.join('; ')}.` : `${base}.`,
    detail: `${scope}${rest.length ? ` Also: ${rest.join(', ')}.` : ''}${reviewNote}`,
  }
}
