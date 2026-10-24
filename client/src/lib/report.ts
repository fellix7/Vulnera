import type { Finding, ScanResult } from '../types'
import { computeFunnel } from './funnel'
import { formatEpss, safeHttpUrl, depPath } from './format'
import { effectiveTier, findingKey, isLowered, type ReviewState } from './review'
import { SEVERITY_LABEL, TIER_LABEL, TIER_ORDER } from './tiers'

/** Untrusted advisory text goes into Markdown: flatten to one line and neutralise markup. */
function md(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_{}[\]<>|#]/g, (c) => `\\${c}`)
}

function code(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const fence = flat.includes('`') ? '``' : '`'
  return `${fence}${flat}${fence}`
}

function fenced(text: string): string {
  let fence = '```'
  while (text.includes(fence)) fence += '`'
  return `${fence}\n${text}\n${fence}`
}

export function reviewExport(result: ScanResult, review: ReviewState) {
  return result.findings.map((f) => {
    const r = review[findingKey(f)]
    return {
      key: findingKey(f),
      originalTier: f.tier,
      effectiveTier: effectiveTier(f, r),
      loweredByReviewer: isLowered(f, r),
      aiDecision: r?.ai ?? null,
    }
  })
}

export function buildJson(result: ScanResult, review: ReviewState): string {
  return JSON.stringify({ ...result, review: reviewExport(result, review) }, null, 2)
}

function findingBlock(f: Finding, review: ReviewState, result: ScanResult): string[] {
  const r = review[findingKey(f)]
  const lines: string[] = []
  const flags = [
    SEVERITY_LABEL[f.advisory.severity],
    `EPSS ${formatEpss(f.enrichment.epss)}`,
    f.enrichment.kev === true ? 'CISA KEV' : f.enrichment.kev === null ? 'KEV: no CVE to check' : null,
    f.pkg.dev ? 'dev only' : 'production',
    f.pkg.direct ? 'direct' : 'transitive',
  ].filter(Boolean)
  lines.push(`#### ${md(f.pkg.name)}@${md(f.pkg.version)} — ${md(f.advisory.id)}`)
  lines.push('')
  lines.push(`${md(f.advisory.summary)}`)
  lines.push('')
  lines.push(`- ${flags.join(' · ')}`)
  if (f.advisory.aliases.length) lines.push(`- Aliases: ${f.advisory.aliases.map(code).join(', ')}`)
  lines.push(`- Dependency path: ${depPath(f.pkg.path, f.pkg.name).map(code).join(' → ')}`)
  if (isLowered(f, r)) lines.push(`- **Lowered by reviewer** from ${TIER_LABEL[f.tier]}`)
  if (f.reasons.length) {
    lines.push('- Why this priority:')
    for (const reason of f.reasons) lines.push(`  - ${md(reason)}`)
  }
  if (f.ai) {
    const decision = r?.ai ? ` — reviewer ${r.ai} this verdict` : ' — awaiting human review'
    lines.push(`- AI assessment: **${f.ai.verdict}**${decision}`)
    lines.push(`  - ${md(f.ai.reasoning)}`)
    for (const c of f.ai.citations) {
      lines.push(`  - ${code(`${c.file}:${c.line}`)}`)
      lines.push('')
      lines.push(fenced(c.quote).replace(/^/gm, '    '))
      lines.push('')
    }
  }
  const plan = result.plans.find((p) => p.name === f.pkg.name && p.from === f.pkg.version)
  if (plan) {
    if (plan.to) {
      lines.push(
        `- Fix: ${code(plan.from)} → ${code(plan.to)}${plan.jump ? ` (${plan.jump})` : ''}${plan.viaParent ? `, upgrade via ${code(plan.viaParent)}` : ''}`,
      )
    } else {
      lines.push('- Fix: no verified fix available')
    }
  }
  const refs = f.advisory.references.map(safeHttpUrl).filter((u): u is string => u !== null)
  if (refs.length) lines.push(`- References: ${refs.map((u) => `<${u}>`).join(' ')}`)
  lines.push('')
  return lines
}

export function buildMarkdown(result: ScanResult, review: ReviewState, source: 'api' | 'mock'): string {
  const funnel = computeFunnel(result.findings, review)
  const out: string[] = []
  out.push('# Vulnera dependency triage report')
  out.push('')
  out.push(`- Scanned: ${result.scannedAt}`)
  out.push(`- Packages inspected: ${result.packageCount}`)
  out.push(`- Findings: ${result.findings.length}`)
  out.push(`- AI analysis: ${result.aiStatus}`)
  if (source === 'mock') out.push('- **Demo data. Not a real scan.**')
  out.push('')
  out.push('> AI assessments are advisory and need human confirmation. AI never decides whether a package is vulnerable (that is an exact OSV.dev lookup), and only a person can lower a finding\'s priority. KEV findings can never be lowered.')
  out.push('')

  out.push('## Summary')
  out.push('')
  out.push('| Tier | Findings |')
  out.push('|---|---|')
  for (const tier of TIER_ORDER) {
    const n = result.findings.filter((f) => effectiveTier(f, review[findingKey(f)]) === tier).length
    out.push(`| ${TIER_LABEL[tier]} | ${n} |`)
  }
  out.push('')

  out.push('## Funnel')
  out.push('')
  out.push(`1. Known vulnerabilities: **${funnel.total}**`)
  out.push(`2. In production code: **${funnel.production}**`)
  out.push(`3. Your code calls the vulnerable function: **${funnel.usesApi}**`)
  out.push(`4. Fix now: **${funnel.fixNow}**`)
  out.push('')
  out.push('Nothing is hidden: every finding is listed below.')
  out.push('')

  out.push('## Findings by tier')
  out.push('')
  for (const tier of TIER_ORDER) {
    const items = result.findings.filter((f) => effectiveTier(f, review[findingKey(f)]) === tier)
    out.push(`### ${TIER_LABEL[tier]} (${items.length})`)
    out.push('')
    if (items.length === 0) {
      out.push('_None._')
      out.push('')
    }
    for (const f of items) out.push(...findingBlock(f, review, result))
  }

  out.push('## Upgrade commands')
  out.push('')
  const plans = [...result.plans].sort((a, b) => Number(!!a.viaParent) - Number(!!b.viaParent))
  for (const p of plans) {
    const head = `- ${code(`${p.name}@${p.from}`)}`
    if (p.to && p.command) {
      out.push(`${head} → ${code(p.to)}${p.jump ? ` (${p.jump})` : ''}${p.viaParent ? `, via ${code(p.viaParent)}` : ''}`)
      out.push('')
      out.push(fenced(p.command).replace(/^/gm, '  '))
      out.push('')
    } else {
      out.push(`${head}: no verified fix available`)
    }
  }
  out.push('')

  out.push('## Reviewer decisions')
  out.push('')
  const decided = result.findings.filter((f) => {
    const r = review[findingKey(f)]
    return r && (r.ai || isLowered(f, r))
  })
  if (decided.length === 0) {
    out.push('_No reviewer decisions recorded._')
  } else {
    for (const f of decided) {
      const r = review[findingKey(f)]
      const parts: string[] = []
      if (r?.ai) parts.push(`AI verdict ${r.ai}`)
      if (isLowered(f, r)) parts.push(`lowered ${TIER_LABEL[f.tier]} → ${TIER_LABEL[effectiveTier(f, r)]}`)
      out.push(`- ${code(findingKey(f))}: ${parts.join('; ')}`)
    }
  }
  out.push('')

  if (result.notes.length) {
    out.push('## Notes')
    out.push('')
    for (const n of result.notes) out.push(`- ${md(n)}`)
    out.push('')
  }
  return out.join('\n')
}
