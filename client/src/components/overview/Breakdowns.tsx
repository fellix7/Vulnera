import { aiCounts, severityCounts, SEVERITY_ORDER } from '../../lib/selectors'
import { SEVERITY_LABEL } from '../../lib/tiers'
import type { Finding, ScanResult, Severity } from '../../types'
import { StackedBar, type Segment } from './StackedBar'

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: 'var(--critical)',
  HIGH: 'var(--high)',
  MODERATE: 'var(--warn)',
  LOW: 'var(--text-3)',
  UNKNOWN: 'var(--line-strong)',
}

/** Compact distributions: severity, production vs development, direct vs transitive, AI coverage. */
export function Breakdowns({ findings, aiStatus }: { findings: Finding[]; aiStatus: ScanResult['aiStatus'] }) {
  const sev = severityCounts(findings)
  const prod = findings.filter((f) => !f.pkg.dev).length
  const direct = findings.filter((f) => f.pkg.direct).length
  const ai = aiCounts(findings)

  const severity: Segment[] = SEVERITY_ORDER.map((s) => ({
    key: s,
    label: SEVERITY_LABEL[s],
    count: sev[s],
    color: SEVERITY_COLOR[s],
    href: `/findings?severity=${s}`,
  }))
  const scope: Segment[] = [
    { key: 'prod', label: 'Production', count: prod, color: 'var(--info)', href: '/findings?scope=prod' },
    { key: 'dev', label: 'Development only', count: findings.length - prod, color: 'var(--neutral)', href: '/findings?scope=dev' },
  ]
  const dep: Segment[] = [
    { key: 'direct', label: 'Direct', count: direct, color: 'var(--text-2)', href: '/findings?dep=direct', hint: 'Listed in your package.json' },
    { key: 'transitive', label: 'Transitive', count: findings.length - direct, color: 'var(--line-strong)', href: '/findings?dep=transitive', hint: 'Pulled in by another package' },
  ]
  const coverage: Segment[] = [
    { key: 'uses', label: 'Uses vulnerable code', count: ai.USES_VULNERABLE_API, color: 'var(--ai)', href: '/findings?ai=uses' },
    { key: 'uncertain', label: 'Uncertain', count: ai.UNCERTAIN, color: 'color-mix(in srgb, var(--ai) 60%, transparent)', href: '/findings?ai=uncertain' },
    { key: 'none', label: 'No usage found', count: ai.NO_VULNERABLE_USAGE_FOUND, color: 'color-mix(in srgb, var(--ai) 30%, transparent)', href: '/findings?ai=none' },
    { key: 'unassessed', label: 'Not assessed', count: ai.NOT_ASSESSED, color: 'var(--line-strong)', href: '/findings?ai=unassessed' },
  ]

  return (
    <div className="ov-breakdowns">
      <StackedBar title="Severity" segments={severity} />
      <StackedBar title="Production vs development" segments={scope} />
      <StackedBar title="Direct vs transitive" segments={dep} />
      <StackedBar
        title="AI code check coverage"
        segments={coverage}
        note={
          aiStatus === 'ok'
            ? 'AI reviews at most the top 30 direct-dependency findings. “Not assessed” does not mean safe.'
            : 'The AI code check did not run, so every finding is “Not assessed”. That does not mean safe.'
        }
      />
    </div>
  )
}
