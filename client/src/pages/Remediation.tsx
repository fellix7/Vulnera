import { useEffect, useMemo, useRef, useState } from 'react'
import { RemediationRow } from '../components/remediation/RemediationRow'
import { StatusLegend } from '../components/remediation/StatusTag'
import {
  buildItems,
  buildOutputs,
  FILTERS,
  matchesFilter,
  overridesSnippet,
  parseFilter,
  summarize,
  type RemFilter,
} from '../components/remediation/model'
import { Icon } from '../components/ui/Icon'
import { Callout, CommandBlock, EmptyState, NoScan, PageHeader } from '../components/ui/Kit'
import { copyText, downloadText } from '../lib/download'
import { Link, setSearch, useLocation } from '../router'
import { useScan, type ScanRecord } from '../state/store'
import './remediation.css'

export default function RemediationPage() {
  const { current } = useScan()
  if (!current) {
    return (
      <>
        <PageHeader eyebrow="Remediation" title="Fix plan" description="The smallest upgrade that clears each package's advisories, with the exact command to run." />
        <NoScan what="the fix plan" />
      </>
    )
  }
  return <Plan key={current.id} current={current} />
}

function Plan({ current }: { current: ScanRecord }) {
  const { result, review } = current
  const demo = current.source === 'demo'
  const { search } = useLocation()
  const filter = parseFilter(search.get('filter'))

  const items = useMemo(() => buildItems(result, review), [result, review])
  const summary = useMemo(() => summarize(items), [items])
  const [includeMajor, setIncludeMajor] = useState(true)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const outputs = useMemo(
    () => buildOutputs(items, { includeMajor, project: current.projectName, scannedAt: result.scannedAt, demo }),
    [items, includeMajor, current.projectName, result.scannedAt, demo],
  )
  const hasOverrides = outputs.commands.some((c) => c.startsWith('npm pkg set overrides.'))
  const transitive = useMemo(() => items.filter((i) => !i.direct && i.plan.to), [items])
  const snippet = useMemo(() => overridesSnippet(transitive), [transitive])

  const counts = useMemo(() => {
    const out = {} as Record<RemFilter, number>
    for (const f of FILTERS) out[f.id] = items.filter((i) => matchesFilter(i, f.id)).length
    return out
  }, [items])
  const visible = useMemo(() => items.filter((i) => matchesFilter(i, filter)), [items, filter])

  function pickFilter(next: RemFilter) {
    const params = new URLSearchParams(search)
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    setSearch(params)
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyAll() {
    const ok = await copyText(outputs.commands.join('\n'))
    setCopied(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied('idle'), 2000)
  }

  const allOpen = visible.length > 0 && visible.every((i) => open.has(i.id))

  return (
    <>
      <PageHeader
        eyebrow="Remediation"
        title="Fix plan"
        description={
          items.length === 0 ? (
            'No upgrade plans were produced for this scan.'
          ) : (
            <span className="rem-summary num">
              <strong>{summary.total}</strong> {summary.total === 1 ? 'package' : 'packages'} to upgrade · <strong>{summary.verified}</strong> verified{' '}
              {summary.verified === 1 ? 'fix' : 'fixes'} · <strong>{summary.major}</strong> {summary.major === 1 ? 'needs' : 'need'} a major version ·{' '}
              <strong>{summary.none}</strong> {summary.none === 1 ? 'has' : 'have'} no verified fix
            </span>
          )
        }
        actions={
          items.length > 0 && (
            <>
              <button type="button" className="btn" onClick={copyAll} disabled={outputs.commands.length === 0}>
                <Icon name={copied === 'copied' ? 'check' : 'copy'} size={14} />
                {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy all verified commands'}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => downloadText('vulnera-fix-plan.sh', outputs.script, 'text/x-shellscript')}>
                <Icon name="download" size={14} />
                Download as shell script
              </button>
            </>
          )
        }
      />
      <span className="sr-only" role="status">
        {copied === 'copied' ? `Copied ${outputs.commands.length} commands to the clipboard` : ''}
      </span>

      <div className="stack rem-page">
        {demo && (
          <Callout tone="demo">
            <strong>Demo data.</strong> These targets and commands are illustrative, not from a real scan. Do not run them against a real project.
          </Callout>
        )}

        {items.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon="shield-check"
              title="Nothing to upgrade"
              actions={
                <Link to="/findings" className="btn">
                  <Icon name="list" size={14} />
                  View findings
                </Link>
              }
            >
              This scan produced no upgrade plans. Findings, if any, are listed on the Findings page.
            </EmptyState>
          </div>
        ) : (
          <>
            <StatusLegend />

            <section className="rem-tools" aria-label="Command options">
              <label className="check">
                <input type="checkbox" checked={!includeMajor} onChange={(e) => setIncludeMajor(!e.target.checked)} />
                Leave major upgrades out of the copied commands and the script
              </label>
              <p className="subtle">
                {pluralCommands(outputs.commands.length)} included, direct dependencies first.
                {outputs.manual.length > 0 &&
                  ` ${outputs.manual.length} ${outputs.manual.length === 1 ? 'needs a manual package.json edit and is' : 'need a manual package.json edit and are'} listed as comments.`}
                {outputs.unsafe.length > 0 && ` ${outputs.unsafe.length} skipped because the command had unexpected characters.`}
                {hasOverrides && (
                  <>
                    {' '}
                    Overrides take effect after <code>npm install</code>; the script runs it for you.
                  </>
                )}
              </p>
              {transitive.length > 0 && (
                <details className="rem-snip">
                  <summary>
                    <Icon name="chevron-right" size={14} className="rem-snip__chev" />
                    package.json overrides snippet for all {transitive.length} transitive {transitive.length === 1 ? 'package' : 'packages'}
                    <span className="badge badge--warn">Suggested</span>
                  </summary>
                  <div className="rem-snip__body">
                    <CommandBlock command={snippet} prompt={false} />
                    <p className="subtle">
                      Suggested: run your tests after applying. If two installed versions of a package need different targets, the highest one is used.
                    </p>
                  </div>
                </details>
              )}
            </section>

            <section aria-labelledby="rem-list-h" className="rem-list-wrap">
              <div className="rem-list-head">
                <div>
                  <h2 id="rem-list-h">Upgrade plan</h2>
                  <p className="subtle">Most urgent first: highest priority tier, then known-exploited, then advisories cleared, then name.</p>
                </div>
                <div className="cluster">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    disabled={visible.length === 0}
                    onClick={() => setOpen((prev) => (allOpen ? new Set([...prev].filter((id) => !visible.some((v) => v.id === id))) : new Set([...prev, ...visible.map((v) => v.id)])))}
                  >
                    <Icon name={allOpen ? 'minus' : 'plus'} size={14} />
                    {allOpen ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>
              </div>

              <div className="seg rem-filter" role="group" aria-label="Filter the upgrade plan">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => pickFilter(f.id)}>
                    {f.label}
                    <span className="count">{counts[f.id]}</span>
                  </button>
                ))}
              </div>
              <p className="sr-only" role="status" aria-live="polite">
                Showing {visible.length} of {items.length} packages
              </p>

              {visible.length === 0 ? (
                <div className="panel">
                  <EmptyState
                    icon="filter"
                    title="Nothing matches this filter"
                    actions={
                      <button type="button" className="btn" onClick={() => pickFilter('all')}>
                        Show all {items.length}
                      </button>
                    }
                  >
                    No package in this plan is in the "{FILTERS.find((f) => f.id === filter)?.label}" group.
                  </EmptyState>
                </div>
              ) : (
                <div className="rem-list-box">
                  <ul className="rem-list">
                    {visible.map((item) => (
                      <RemediationRow key={item.id} item={item} review={review} open={open.has(item.id)} onToggle={() => toggle(item.id)} />
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <Callout tone="info">
              <strong>After you upgrade, re-run the scan</strong> to confirm the findings are resolved.{' '}
              <Link to="/scan" className="link">
                Scan again
              </Link>
              , then open{' '}
              <Link to="/reports#compare" className="link">
                Reports, Compare
              </Link>{' '}
              to see what was resolved and whether anything new appeared.
            </Callout>
          </>
        )}
      </div>
    </>
  )
}

const pluralCommands = (n: number) => `${n} ${n === 1 ? 'command' : 'commands'}`
