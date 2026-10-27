// Pure logic for the findings explorer: the URL <-> filter contract, row precomputation, filtering and sorting.
// Contract (shared with other pages that deep-link here): tier, severity, scope, dep, ai, kev, q, sort (+ optional dir).
import { depPath } from '../../lib/format'
import { effectiveTier, findingKey, isLowered, type ReviewState } from '../../lib/review'
import { AI_STATE_LABEL, aiState, byPriority, cveOf, findingHref, planFor, SEVERITY_ORDER, type AiState } from '../../lib/selectors'
import { SEVERITY_LABEL, TIER_LABEL, TIER_ORDER } from '../../lib/tiers'
import type { Finding, ScanResult, Severity, Tier, UpgradePlan } from '../../types'

export const SORT_KEYS = ['priority', 'severity', 'epss', 'package'] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type SortDir = 'asc' | 'desc'
/** Sorts a column header can switch to; `priority` is the default and has no header button. */
export type SortableCol = Exclude<SortKey, 'priority'>
export const SCOPES = ['prod', 'dev'] as const
export type Scope = (typeof SCOPES)[number]
export const DEPS = ['direct', 'transitive'] as const
export type Dep = (typeof DEPS)[number]
export const AI_FILTERS = ['uses', 'uncertain', 'none', 'unassessed'] as const
export type AiFilter = (typeof AI_FILTERS)[number]

export const AI_FILTER_STATE: Record<AiFilter, AiState> = {
  uses: 'USES_VULNERABLE_API',
  uncertain: 'UNCERTAIN',
  none: 'NO_VULNERABLE_USAGE_FOUND',
  unassessed: 'NOT_ASSESSED',
}
export const AI_FILTER_LABEL: Record<AiFilter, string> = {
  uses: AI_STATE_LABEL.USES_VULNERABLE_API,
  uncertain: AI_STATE_LABEL.UNCERTAIN,
  none: AI_STATE_LABEL.NO_VULNERABLE_USAGE_FOUND,
  unassessed: AI_STATE_LABEL.NOT_ASSESSED,
}
export const SCOPE_LABEL: Record<Scope, string> = { prod: 'Production', dev: 'Dev only' }
export const DEP_LABEL: Record<Dep, string> = { direct: 'Direct', transitive: 'Transitive' }
export const SORT_LABEL: Record<SortKey, string> = {
  priority: 'Priority',
  severity: 'Severity',
  epss: 'EPSS',
  package: 'Package',
}
/** Direction a sort takes when first chosen: most severe / most likely first, A to Z for names. */
export const NATURAL_DIR: Record<SortKey, SortDir> = { priority: 'asc', severity: 'desc', epss: 'desc', package: 'asc' }

export interface Filters {
  tier: Tier[]
  severity: Severity[]
  scope: Scope | null
  dep: Dep | null
  ai: AiFilter | null
  kev: boolean
  q: string
  sort: SortKey
  dir: SortDir
}

export const EMPTY_FILTERS: Pick<Filters, 'tier' | 'severity' | 'scope' | 'dep' | 'ai' | 'kev' | 'q'> = {
  tier: [],
  severity: [],
  scope: null,
  dep: null,
  ai: null,
  kev: false,
  q: '',
}

/* ---------- URL <-> filters ---------- */

function pickOne<T extends string>(raw: string | null, valid: readonly T[]): T | null {
  const v = raw?.trim().toLowerCase() ?? ''
  return (valid as readonly string[]).includes(v) ? (v as T) : null
}

/** Comma-separated, case-insensitive list; unknown values are ignored; result is in canonical order. */
function pickMany<T extends string>(raw: string | null, valid: readonly T[]): T[] {
  if (!raw) return []
  const wanted = new Set(raw.split(',').map((s) => s.trim().toUpperCase()))
  return valid.filter((v) => wanted.has(v))
}

export function parseFilters(p: URLSearchParams): Filters {
  const sort = pickOne(p.get('sort'), SORT_KEYS) ?? 'priority'
  const dirRaw = pickOne(p.get('dir'), ['asc', 'desc'] as const)
  return {
    tier: pickMany(p.get('tier'), TIER_ORDER),
    severity: pickMany(p.get('severity'), SEVERITY_ORDER),
    scope: pickOne(p.get('scope'), SCOPES),
    dep: pickOne(p.get('dep'), DEPS),
    ai: pickOne(p.get('ai'), AI_FILTERS),
    kev: ['1', 'true', 'yes'].includes((p.get('kev') ?? '').toLowerCase()),
    q: (p.get('q') ?? '').trim(),
    sort,
    dir: sort !== 'priority' && dirRaw ? dirRaw : NATURAL_DIR[sort],
  }
}

const OWN_KEYS = ['tier', 'severity', 'scope', 'dep', 'ai', 'kev', 'q', 'sort', 'dir']

/** Write filters over a copy of `base`, leaving unrelated params alone. Defaults are omitted to keep URLs short. */
export function filtersToParams(f: Filters, base?: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base)
  for (const k of OWN_KEYS) p.delete(k)
  if (f.tier.length) p.set('tier', f.tier.join(','))
  if (f.severity.length) p.set('severity', f.severity.join(','))
  if (f.scope) p.set('scope', f.scope)
  if (f.dep) p.set('dep', f.dep)
  if (f.ai) p.set('ai', f.ai)
  if (f.kev) p.set('kev', '1')
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.sort !== 'priority') {
    p.set('sort', f.sort)
    if (f.dir !== NATURAL_DIR[f.sort]) p.set('dir', f.dir)
  }
  return p
}

export function hasActiveFilters(f: Filters): boolean {
  return f.tier.length > 0 || f.severity.length > 0 || !!f.scope || !!f.dep || !!f.ai || f.kev || f.q !== ''
}

export interface FilterChip {
  id: string
  label: string
  /** Applying this patch removes the chip's filter. */
  patch: Partial<Filters>
}

export function filterChips(f: Filters): FilterChip[] {
  const chips: FilterChip[] = []
  for (const t of f.tier) chips.push({ id: `tier:${t}`, label: `Priority: ${TIER_LABEL[t]}`, patch: { tier: f.tier.filter((x) => x !== t) } })
  for (const s of f.severity)
    chips.push({ id: `sev:${s}`, label: `Severity: ${SEVERITY_LABEL[s]}`, patch: { severity: f.severity.filter((x) => x !== s) } })
  if (f.scope) chips.push({ id: 'scope', label: `Scope: ${SCOPE_LABEL[f.scope]}`, patch: { scope: null } })
  if (f.dep) chips.push({ id: 'dep', label: `Dependency: ${DEP_LABEL[f.dep]}`, patch: { dep: null } })
  if (f.ai) chips.push({ id: 'ai', label: `AI: ${AI_FILTER_LABEL[f.ai]}`, patch: { ai: null } })
  if (f.kev) chips.push({ id: 'kev', label: 'KEV only', patch: { kev: false } })
  if (f.q) chips.push({ id: 'q', label: `Search: "${f.q.length > 24 ? `${f.q.slice(0, 23)}…` : f.q}"`, patch: { q: '' } })
  return chips
}

/* ---------- rows ---------- */

export interface Row {
  f: Finding
  key: string
  href: string
  /** Position in the default priority order; used as the stable tie-breaker for every other sort. */
  rank: number
  /** Effective tier (after a reviewer's lowering). */
  tier: Tier
  lowered: boolean
  plan: UpgradePlan | undefined
  cve: string | undefined
  ai: AiState
  /** Dependency chain ending in the package itself. */
  chain: string[]
  haystack: string
}

/** Precompute everything a row needs once per scan/review, in the server's priority order. */
export function buildRows(result: ScanResult, review: ReviewState): Row[] {
  return [...result.findings].sort(byPriority(review)).map((f, rank) => {
    const key = findingKey(f)
    const r = review[key]
    const cve = cveOf(f.advisory)
    return {
      f,
      key,
      href: findingHref(f),
      rank,
      tier: effectiveTier(f, r),
      lowered: isLowered(f, r),
      plan: planFor(result, f),
      cve,
      ai: aiState(f),
      chain: depPath(f.pkg.path, f.pkg.name),
      haystack: [f.pkg.name, f.pkg.version, `${f.pkg.name}@${f.pkg.version}`, f.advisory.id, ...f.advisory.aliases, f.advisory.summary]
        .join(' ')
        .toLowerCase(),
    }
  })
}

/* ---------- view (filter + sort + group) ---------- */

export interface Group {
  tier: Tier | null
  rows: Row[]
}

export interface View {
  rows: Row[]
  groups: Group[]
  grouped: boolean
  /** Counts per effective tier among findings matching every filter except the tier filter. */
  tierCounts: Record<Tier, number>
  /** Findings matching every filter except the tier filter (the "All" count). */
  baseTotal: number
  total: number
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const SEV_IDX: Record<Severity, number> = Object.fromEntries(SEVERITY_ORDER.map((s, i) => [s, i])) as Record<Severity, number>

function matchesBase(r: Row, f: Filters, tokens: string[], sev: Set<Severity>): boolean {
  if (sev.size && !sev.has(r.f.advisory.severity)) return false
  if (f.scope && (f.scope === 'dev') !== r.f.pkg.dev) return false
  if (f.dep && (f.dep === 'direct') !== r.f.pkg.direct) return false
  if (f.ai && r.ai !== AI_FILTER_STATE[f.ai]) return false
  if (f.kev && r.f.enrichment.kev !== true) return false
  for (const t of tokens) if (!r.haystack.includes(t)) return false
  return true
}

export function sortRows(rows: Row[], sort: SortKey, dir: SortDir): Row[] {
  if (sort === 'priority') return rows // already in rank order
  const flip = dir === NATURAL_DIR[sort] ? 1 : -1
  const out = [...rows]
  if (sort === 'severity') {
    out.sort((a, b) => flip * (SEV_IDX[a.f.advisory.severity] - SEV_IDX[b.f.advisory.severity]) || a.rank - b.rank)
  } else if (sort === 'epss') {
    out.sort((a, b) => {
      const x = a.f.enrichment.epss
      const y = b.f.enrichment.epss
      // No score means unknown, not zero: always last, in either direction.
      if (x === null || y === null) return x === y ? a.rank - b.rank : x === null ? 1 : -1
      return flip * (y - x) || a.rank - b.rank
    })
  } else {
    out.sort(
      (a, b) =>
        flip *
          (collator.compare(a.f.pkg.name, b.f.pkg.name) ||
            collator.compare(a.f.pkg.version, b.f.pkg.version) ||
            collator.compare(a.f.advisory.id, b.f.advisory.id)) || a.rank - b.rank,
    )
  }
  return out
}

export function buildView(rows: Row[], f: Filters): View {
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  const sev = new Set(f.severity)
  const base = rows.filter((r) => matchesBase(r, f, tokens, sev))

  const tierCounts: Record<Tier, number> = { FIX_NOW: 0, FIX_SPRINT: 0, PLAN: 0, MONITOR: 0 }
  for (const r of base) tierCounts[r.tier]++

  const tiers = new Set(f.tier)
  const matched = tiers.size ? base.filter((r) => tiers.has(r.tier)) : base
  const ordered = sortRows(matched, f.sort, f.dir)

  const grouped = f.sort === 'priority' && tiers.size === 0
  let groups: Group[]
  if (grouped) {
    // With no filter active every tier is listed (even empty ones) so the ranking explains itself.
    const showEmpty = !hasActiveFilters(f)
    groups = TIER_ORDER.map((tier) => ({ tier, rows: ordered.filter((r) => r.tier === tier) })).filter((g) => showEmpty || g.rows.length > 0)
  } else {
    groups = [{ tier: null, rows: ordered }]
  }
  return { rows: ordered, groups, grouped, tierCounts, baseTotal: base.length, total: rows.length }
}
