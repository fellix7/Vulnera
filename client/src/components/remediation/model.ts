// Pure logic for the remediation page: derive one item per upgrade plan, order by urgency,
// filter, and build the copy-all / shell-script outputs. No React in here so it is easy to reason about.
import { effectiveTier, findingKey, type ReviewState } from '../../lib/review'
import { findingsForPlan, SEVERITY_ORDER } from '../../lib/selectors'
import { TIER_ORDER } from '../../lib/tiers'
import type { Finding, ScanResult, Severity, Tier, UpgradePlan } from '../../types'

/** verified: direct, non-major, target re-checked. test: target re-checked, but the change itself is a suggestion. none: no verified target. */
export type FixStatus = 'verified' | 'test' | 'none'

export const STATUS_LABEL: Record<FixStatus, string> = {
  verified: 'Verified fix',
  test: 'Suggested: test first',
  none: 'No verified fix',
}

export type CommandKind = 'install' | 'override' | 'manual'

export interface CommandInfo {
  text: string
  kind: CommandKind
  /** Matches the exact npm command shapes the planner produces, so it is safe to put in a shell script. */
  safe: boolean
}

export interface RemediationItem {
  id: string
  plan: UpgradePlan
  findings: Finding[]
  /** Highest effective tier (review-aware) among the advisories this plan clears. */
  tier: Tier
  severity: Severity
  kev: boolean
  direct: boolean
  dev: boolean
  major: boolean
  status: FixStatus
  /** Direct dependency to upgrade for a transitive package. */
  parent: string | null
  /** Chain that pulled the package in, ending in the package itself (empty when unknown). */
  path: string[]
  command: CommandInfo | null
}

export type RemFilter = 'all' | 'fix-now' | 'direct' | 'transitive' | 'major' | 'no-fix'

export const FILTERS: { id: RemFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fix-now', label: 'Fix now' },
  { id: 'direct', label: 'Direct' },
  { id: 'transitive', label: 'Transitive' },
  { id: 'major', label: 'Major upgrades' },
  { id: 'no-fix', label: 'No verified fix' },
]

export function parseFilter(raw: string | null): RemFilter {
  return FILTERS.some((f) => f.id === raw) ? (raw as RemFilter) : 'all'
}

// ---------------------------------------------------------------------------
// Commands

const NAME = String.raw`(?:@[A-Za-z0-9][A-Za-z0-9._~-]*\/)?[A-Za-z0-9][A-Za-z0-9._~-]*`
const VER = String.raw`[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`
const INSTALL_RE = new RegExp(`^npm install (?:(?:-D|--save-dev) )?${NAME}@${VER}$`)
const OVERRIDE_RE = new RegExp(`^npm pkg set overrides\\.${NAME}=${VER}$`)

export function classifyCommand(text: string): CommandInfo {
  if (text.startsWith('Add to package.json')) return { text, kind: 'manual', safe: false }
  if (text.startsWith('npm pkg set overrides.')) return { text, kind: 'override', safe: OVERRIDE_RE.test(text) }
  return { text, kind: 'install', safe: INSTALL_RE.test(text) }
}

/** Minimal semver ordering (major.minor.patch, prerelease sorts before release). Enough to compare registry versions. */
export function cmpVersion(a: string, b: string): number {
  const parse = (v: string) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v)
    return m ? { n: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? '' } : null
  }
  const x = parse(a)
  const y = parse(b)
  if (!x || !y) return a.localeCompare(b)
  for (let i = 0; i < 3; i++) if (x.n[i] !== y.n[i]) return x.n[i]! - y.n[i]!
  if (x.pre === y.pre) return 0
  if (!x.pre) return 1
  if (!y.pre) return -1
  return x.pre.localeCompare(y.pre, undefined, { numeric: true })
}

// ---------------------------------------------------------------------------
// Items

function highestTier(tiers: Tier[]): Tier {
  return tiers.reduce((best, t) => (TIER_ORDER.indexOf(t) < TIER_ORDER.indexOf(best) ? t : best), 'MONITOR' as Tier)
}

function highestSeverity(items: Severity[]): Severity {
  return items.reduce((best, s) => (SEVERITY_ORDER.indexOf(s) < SEVERITY_ORDER.indexOf(best) ? s : best), 'UNKNOWN' as Severity)
}

export function tierOfFinding(f: Finding, review: ReviewState): Tier {
  return effectiveTier(f, review[findingKey(f)])
}

function itemFor(result: ScanResult, review: ReviewState, plan: UpgradePlan): RemediationItem {
  const findings = findingsForPlan(result, plan)
  const direct = findings.length > 0 ? findings[0]!.pkg.direct && !plan.viaParent : !plan.viaParent
  const major = plan.jump === 'major'
  const status: FixStatus = !plan.to ? 'none' : major || !direct ? 'test' : 'verified'
  const rawPath = findings[0]?.pkg.path ?? []
  const path = rawPath.length === 0 ? [] : rawPath[rawPath.length - 1] === plan.name ? rawPath : [...rawPath, plan.name]
  return {
    id: `${plan.name}@${plan.from}`,
    plan,
    findings,
    tier: findings.length > 0 ? highestTier(findings.map((f) => tierOfFinding(f, review))) : 'MONITOR',
    severity: highestSeverity(findings.map((f) => f.advisory.severity)),
    kev: findings.some((f) => f.enrichment.kev === true),
    direct,
    dev: findings.length > 0 && findings.every((f) => f.pkg.dev),
    major,
    status,
    parent: plan.viaParent ?? null,
    path,
    command: plan.command ? classifyCommand(plan.command) : null,
  }
}

/** Urgency order: highest effective tier, then KEV, then advisories cleared, then name. */
export function compareItems(a: RemediationItem, b: RemediationItem): number {
  return (
    TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
    Number(b.kev) - Number(a.kev) ||
    b.findings.length - a.findings.length ||
    a.plan.name.localeCompare(b.plan.name) ||
    cmpVersion(a.plan.from, b.plan.from)
  )
}

export function buildItems(result: ScanResult, review: ReviewState): RemediationItem[] {
  return result.plans.map((p) => itemFor(result, review, p)).sort(compareItems)
}

export function matchesFilter(item: RemediationItem, filter: RemFilter): boolean {
  switch (filter) {
    case 'fix-now':
      return item.tier === 'FIX_NOW'
    case 'direct':
      return item.direct
    case 'transitive':
      return !item.direct
    case 'major':
      return item.major
    case 'no-fix':
      return !item.plan.to
    default:
      return true
  }
}

export interface Summary {
  total: number
  verified: number
  major: number
  none: number
}

export function summarize(items: RemediationItem[]): Summary {
  return {
    total: items.length,
    verified: items.filter((i) => i.plan.to).length,
    major: items.filter((i) => i.major).length,
    none: items.filter((i) => !i.plan.to).length,
  }
}

// ---------------------------------------------------------------------------
// Reasons for "no verified fix"

export interface NoFixReasons {
  /** Advisories that list no fixed version above the installed one. */
  unfixed: Finding[]
  /** The smallest published fix that would clear every advisory, when one exists (it was still vulnerable in OSV). */
  candidate: string | null
}

export function noFixReasons(item: RemediationItem): NoFixReasons {
  const from = item.plan.from
  const above = (f: Finding) => f.advisory.fixedVersions.filter((v) => cmpVersion(v, from) > 0).sort(cmpVersion)
  const unfixed = item.findings.filter((f) => above(f).length === 0)
  if (unfixed.length > 0 || item.findings.length === 0) return { unfixed, candidate: null }
  const candidate = item.findings.map((f) => above(f)[0]!).reduce((hi, v) => (cmpVersion(v, hi) > 0 ? v : hi))
  return { unfixed, candidate }
}

// ---------------------------------------------------------------------------
// Overrides snippet

/** `{ "overrides": { name: version } }` for the given transitive items (highest target wins when a name repeats). */
export function overridesSnippet(items: RemediationItem[]): string {
  const map = new Map<string, string>()
  for (const i of items) {
    const to = i.plan.to
    if (!to) continue
    const prev = map.get(i.plan.name)
    if (!prev || cmpVersion(to, prev) > 0) map.set(i.plan.name, to)
  }
  return JSON.stringify({ overrides: Object.fromEntries(map) }, null, 2)
}

// ---------------------------------------------------------------------------
// Copy-all and shell script

export interface FixOutputs {
  /** Runnable commands: direct-dependency installs first, then transitive changes. De-duplicated. */
  commands: string[]
  script: string
  /** Plans that have a target but no runnable command (package.json edits) or an unexpected command shape. */
  manual: RemediationItem[]
  /** Commands left out because they did not match the expected npm command shape. */
  unsafe: RemediationItem[]
  noFix: RemediationItem[]
}

/** One printable ASCII line; package data is untrusted, so nothing can break out of a shell comment. */
function comment(text: string): string {
  return text.replace(/[^\x20-\x7e]+/g, '?').slice(0, 160)
}

const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function buildOutputs(
  items: RemediationItem[],
  opts: { includeMajor: boolean; project: string; scannedAt: string; demo: boolean },
): FixOutputs {
  const wanted = items.filter((i) => i.plan.to && (opts.includeMajor || !i.major))
  const manual = wanted.filter((i) => !i.command || i.command.kind === 'manual')
  const unsafe = wanted.filter((i) => i.command && i.command.kind !== 'manual' && !i.command.safe)
  const runnable = wanted.filter((i) => i.command && i.command.kind !== 'manual' && i.command.safe)
  const direct = runnable.filter((i) => i.direct)
  const transitive = runnable.filter((i) => !i.direct)
  const noFix = items.filter((i) => !i.plan.to)
  const skippedMajor = items.filter((i) => i.plan.to && i.major && !opts.includeMajor)

  const seen = new Set<string>()
  const commands: string[] = []
  const lines: string[] = []
  const emit = (group: RemediationItem[], head: string[]) => {
    if (group.length === 0) return
    lines.push('', ...head.map((h) => `# ${h}`))
    for (const i of group) {
      const p = i.plan
      const via = i.parent ? `, pulled in by ${comment(i.parent)}` : ''
      lines.push(
        '',
        `# ${comment(p.name)} ${comment(p.from)} -> ${comment(p.to!)} (${p.jump ?? 'version change'})${via}`,
        `#   clears ${pl(i.findings.length, 'advisory', 'advisories')}${i.kev ? ', includes a CISA KEV entry' : ''}; target re-checked against OSV`,
      )
      if (i.major) lines.push('#   MAJOR version: may contain breaking changes, test before shipping')
      const cmd = i.command!.text
      lines.push(cmd)
      if (!seen.has(cmd)) {
        seen.add(cmd)
        commands.push(cmd)
      }
    }
  }

  lines.push('#!/bin/sh')
  lines.push(`# Vulnera fix plan for ${comment(opts.project)}`)
  lines.push(`# Scan time: ${comment(opts.scannedAt)}`)
  if (opts.demo) lines.push('# DEMO DATA: illustrative, not a real scan. Do not run these commands.')
  lines.push('# Run from the folder that contains package.json. Review each change and run your tests before shipping.')
  lines.push('# Target versions were re-checked against OSV. Transitive changes are suggestions: test after applying.')
  lines.push('set -e')

  emit(direct, ['Direct dependencies (npm install)'])
  emit(transitive, ['Transitive dependencies (suggested, run your tests after applying)'])
  if (transitive.some((i) => i.command!.kind === 'override')) {
    lines.push('', '# Apply the overrides to package-lock.json', 'npm install')
  }

  if (manual.length > 0 || unsafe.length > 0) {
    lines.push('', '# Manual steps (not run by this script)')
    for (const i of manual) {
      lines.push(`# ${comment(i.plan.name)} ${comment(i.plan.from)} -> ${comment(i.plan.to!)}: ${comment(i.command?.text ?? 'edit package.json by hand')}`)
    }
    for (const i of unsafe) {
      lines.push(`# ${comment(i.plan.name)} ${comment(i.plan.from)} -> ${comment(i.plan.to!)}: command skipped (unexpected characters), apply by hand`)
    }
  }
  if (skippedMajor.length > 0) {
    lines.push('', '# Major upgrades left out of this script (review them separately)')
    for (const i of skippedMajor) lines.push(`# ${comment(i.plan.name)} ${comment(i.plan.from)} -> ${comment(i.plan.to!)} (major)`)
  }
  if (noFix.length > 0) {
    lines.push('', '# No verified fix: replace, remove or monitor these')
    for (const i of noFix) lines.push(`# ${comment(i.plan.name)} ${comment(i.plan.from)}: ${pl(i.findings.length, 'advisory', 'advisories')} ${i.findings.length === 1 ? 'remains' : 'remain'}`)
  }
  lines.push('', '# Afterwards, re-run the Vulnera scan to confirm the findings are resolved.', '')

  return { commands, script: lines.join('\n'), manual, unsafe, noFix }
}
