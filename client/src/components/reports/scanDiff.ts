// Pure logic for the Reports page: compare two saved scans, list reviewer decisions, name export files.
import { effectiveTier, findingKey, isLowered, type AiDecision, type ReviewState } from '../../lib/review'
import { byPriority } from '../../lib/selectors'
import { TIER_ORDER } from '../../lib/tiers'
import type { ScanRecord } from '../../state/store'
import type { Finding, Severity, Tier } from '../../types'

// ---------------------------------------------------------------------------
// Compare

/** Version-independent identity: an upgrade (same package, same advisory, new version) still counts as the same finding. */
export function compareKey(f: Finding): string {
  return `${f.pkg.name}#${f.advisory.id}`
}

export interface CompareItem {
  key: string
  name: string
  advisoryId: string
  summary: string
  severity: Severity
  /** Installed versions in each scan (a package can be installed at more than one version). */
  baselineVersions: string[]
  latestVersions: string[]
  baselineTier: Tier | null
  latestTier: Tier | null
  /** Finding to link to, taken from whichever scan the item comes from (latest first). */
  finding: Finding
}

export interface ScanStats {
  findings: number
  fixNow: number
  packages: number
}

export interface Comparison {
  resolved: CompareItem[]
  added: CompareItem[]
  still: CompareItem[]
  baseline: ScanStats
  latest: ScanStats
}

function highest(tiers: Tier[]): Tier | null {
  if (tiers.length === 0) return null
  return tiers.reduce((best, t) => (TIER_ORDER.indexOf(t) < TIER_ORDER.indexOf(best) ? t : best))
}

function group(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = compareKey(f)
    const list = map.get(key)
    if (list) list.push(f)
    else map.set(key, [f])
  }
  return map
}

function stats(rec: ScanRecord): ScanStats {
  const { result, review } = rec
  return {
    findings: result.findings.length,
    fixNow: result.findings.filter((f) => effectiveTier(f, review[findingKey(f)]) === 'FIX_NOW').length,
    packages: result.packageCount,
  }
}

function versionsOf(list: Finding[] | undefined): string[] {
  return list ? [...new Set(list.map((f) => f.pkg.version))] : []
}

function tierOf(list: Finding[] | undefined, review: ReviewState): Tier | null {
  return list ? highest(list.map((f) => effectiveTier(f, review[findingKey(f)]))) : null
}

export function compareScans(baseline: ScanRecord, latest: ScanRecord): Comparison {
  const base = group(baseline.result.findings)
  const next = group(latest.result.findings)
  const keys = new Set([...base.keys(), ...next.keys()])

  const resolved: CompareItem[] = []
  const added: CompareItem[] = []
  const still: CompareItem[] = []

  for (const key of keys) {
    const b = base.get(key)
    const l = next.get(key)
    const finding = (l ?? b)![0]!
    const item: CompareItem = {
      key,
      name: finding.pkg.name,
      advisoryId: finding.advisory.id,
      summary: finding.advisory.summary,
      severity: finding.advisory.severity,
      baselineVersions: versionsOf(b),
      latestVersions: versionsOf(l),
      baselineTier: tierOf(b, baseline.review),
      latestTier: tierOf(l, latest.review),
      finding,
    }
    if (b && l) still.push(item)
    else if (b) resolved.push(item)
    else added.push(item)
  }

  const order = (a: CompareItem, b: CompareItem) =>
    TIER_ORDER.indexOf(a.latestTier ?? a.baselineTier ?? 'MONITOR') - TIER_ORDER.indexOf(b.latestTier ?? b.baselineTier ?? 'MONITOR') ||
    a.name.localeCompare(b.name) ||
    a.advisoryId.localeCompare(b.advisoryId)
  resolved.sort(order)
  added.sort(order)
  still.sort(order)

  return { resolved, added, still, baseline: stats(baseline), latest: stats(latest) }
}

// ---------------------------------------------------------------------------
// Reviewer decisions

export interface Decision {
  finding: Finding
  ai: AiDecision | null
  lowered: boolean
  originalTier: Tier
  effectiveTier: Tier
}

export function reviewerDecisions(findings: Finding[], review: ReviewState): Decision[] {
  const out: Decision[] = []
  for (const f of findings) {
    const r = review[findingKey(f)]
    if (!r) continue
    const lowered = isLowered(f, r)
    if (!r.ai && !lowered) continue
    out.push({ finding: f, ai: r.ai ?? null, lowered, originalTier: f.tier, effectiveTier: effectiveTier(f, r) })
  }
  return out.sort((a, b) => byPriority(review)(a.finding, b.finding))
}

// ---------------------------------------------------------------------------
// Export file names

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '')
  return slug || 'project'
}

export function exportFileName(rec: ScanRecord, ext: 'md' | 'json'): string {
  const d = new Date(rec.result.scannedAt)
  const date = (Number.isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10)
  return `vulnera-report-${slugify(rec.projectName)}-${date}.${ext}`
}
