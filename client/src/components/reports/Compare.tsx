import { useMemo, useState, type ReactNode } from 'react'
import { findingKey } from '../../lib/review'
import { findingHref, formatScanTime } from '../../lib/selectors'
import { Link } from '../../router'
import type { ScanRecord } from '../../state/store'
import { SeverityBadge, TierBadge } from '../ui/Badges'
import { Icon, type IconName } from '../ui/Icon'
import { Callout } from '../ui/Kit'
import { compareScans, type CompareItem } from './scanDiff'

interface Props {
  /** Saved scans, newest first (demo data is never in here). */
  scans: ScanRecord[]
  current: ScanRecord | null
  baselineId: string | null
  latestId: string | null
  onBaseline: (id: string) => void
  onLatest: (id: string) => void
  onSwap: (baselineId: string, latestId: string) => void
}

const label = (r: ScanRecord) => `${r.projectName} · ${formatScanTime(r.result.scannedAt)} · ${r.result.findings.length} findings`

export function Compare({ scans, current, baselineId, latestId, onBaseline, onLatest, onSwap }: Props) {
  const enough = scans.length >= 2
  // Defaults: the two most recent scans. Ids that no longer exist (deleted scans) fall back to the defaults.
  const baseline = scans.find((r) => r.id === baselineId) ?? scans[1]
  const latest = scans.find((r) => r.id === latestId) ?? scans[0]
  const same = !!baseline && !!latest && baseline.id === latest.id
  const reversed = !!baseline && !!latest && !same && scans.indexOf(baseline) < scans.indexOf(latest)

  const result = useMemo(() => (enough && baseline && latest && !same ? compareScans(baseline, latest) : null), [enough, baseline, latest, same])
  const currentKeys = useMemo(() => new Set((current?.result.findings ?? []).map(findingKey)), [current])

  return (
    <section id="compare" className="panel rep-compare" aria-labelledby="rep-compare-h" tabIndex={-1}>
      <div className="panel__head">
        <h2 id="rep-compare-h">Compare scans</h2>
      </div>
      <div className="panel__body rep-compare__body">
        {!enough || !baseline || !latest ? (
          <div className="rep-compare__empty">
            <span className="empty__icon">
              <Icon name="compare" />
            </span>
            <div>
              <p>
                <strong>Run another scan after upgrading to see what was resolved.</strong>
              </p>
              <p className="muted">
                Comparing needs two saved scans of the same project. {scans.length === 1 ? 'You have one so far.' : 'You have none yet.'} After you apply the
                fix plan, scan again and the findings that went away show up here as resolved.
              </p>
              <p>
                <Link to="/scan" className="btn btn--primary btn--sm">
                  <Icon name="upload" size={14} />
                  Scan a project
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rep-pick">
              <div className="field">
                <label htmlFor="rep-baseline">Baseline (older)</label>
                <select id="rep-baseline" className="select" value={baseline.id} onChange={(e) => onBaseline(e.target.value)}>
                  {scans.map((r) => (
                    <option key={r.id} value={r.id}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn--sm rep-pick__swap"
                title="Swap baseline and latest"
                onClick={() => onSwap(latest.id, baseline.id)}
              >
                <Icon name="sort" size={14} className="rep-swap-icon" />
                Swap
              </button>
              <div className="field">
                <label htmlFor="rep-latest">Latest (newer)</label>
                <select id="rep-latest" className="select" value={latest.id} onChange={(e) => onLatest(e.target.value)}>
                  {scans.map((r) => (
                    <option key={r.id} value={r.id}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {same && <Callout tone="warn">Choose two different scans to compare.</Callout>}
            {reversed && (
              <Callout tone="warn">
                The baseline is newer than the latest scan, so "Resolved" and "New" are reversed. Use the swap button to put the older scan first.
              </Callout>
            )}
            {!same && baseline.projectName !== latest.projectName && (
              <Callout tone="info">
                These scans are from different projects ({baseline.projectName} and {latest.projectName}). Findings are matched by package name and advisory
                id, so the result is only meaningful if both are the same codebase.
              </Callout>
            )}

            {result && (
              <>
                <dl className="rep-deltas" aria-label="Summary of changes">
                  <Tile icon="check" tone="ok" label="Resolved" value={result.resolved.length} hint="in the baseline, gone in the latest" />
                  <Tile icon="alert" tone="critical" label="New" value={result.added.length} hint="only in the latest" />
                  <Tile icon="minus" tone="neutral" label="Still open" value={result.still.length} hint="in both scans" />
                  <Delta label="Fix now" from={result.baseline.fixNow} to={result.latest.fixNow} />
                  <Delta label="Total findings" from={result.baseline.findings} to={result.latest.findings} />
                </dl>

                <div className="rep-lists">
                  <CompareList
                    title="Resolved"
                    tone="ok"
                    icon="check"
                    items={result.resolved}
                    currentKeys={currentKeys}
                    empty="Nothing from the baseline was resolved."
                    note="Not reported in the latest scan: the package was upgraded or removed, or the advisory data changed."
                  />
                  <CompareList
                    title="New"
                    tone="critical"
                    icon="alert"
                    items={result.added}
                    currentKeys={currentKeys}
                    empty="No new findings in the latest scan."
                    note="Reported in the latest scan only."
                  />
                  <CompareList
                    title="Still open"
                    tone="neutral"
                    icon="minus"
                    items={result.still}
                    currentKeys={currentKeys}
                    empty="No finding appears in both scans."
                    note="Reported in both scans. Matched by package and advisory, so a version bump does not hide it."
                  />
                </div>
                <p className="subtle rep-fine">
                  Findings are matched by package name and advisory id, not by version, so upgrading a package that still has the same advisory leaves it under
                  "Still open".
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function Tile({ icon, tone, label, value, hint }: { icon: IconName; tone: 'ok' | 'critical' | 'neutral'; label: string; value: number; hint: string }) {
  return (
    <div className={`rep-tile rep-tile--${tone}`}>
      <dt>
        <Icon name={icon} size={14} />
        {label}
      </dt>
      <dd>
        <span className="rep-tile__n num">{value}</span>
        <span className="subtle">{hint}</span>
      </dd>
    </div>
  )
}

function Delta({ label, from, to }: { label: string; from: number; to: number }) {
  const d = to - from
  const tone = d < 0 ? 'ok' : d > 0 ? 'critical' : 'neutral'
  const text = d < 0 ? `${-d} fewer` : d > 0 ? `${d} more` : 'no change'
  return (
    <div className="rep-tile rep-tile--delta">
      <dt>{label}</dt>
      <dd>
        <span className="rep-tile__n num">
          {from} <Icon name="arrow-right" size={14} /> {to}
        </span>
        <span className={`rep-delta rep-delta--${tone}`}>
          <Icon name={d < 0 ? 'arrow-down' : d > 0 ? 'arrow-up-right' : 'minus'} size={12} />
          {text}
        </span>
      </dd>
    </div>
  )
}

const LIMIT = 20

function versions(item: CompareItem): ReactNode {
  const b = item.baselineVersions.join(', ')
  const l = item.latestVersions.join(', ')
  if (!b) return <span className="mono">{l}</span>
  if (!l || b === l) return <span className="mono">{b || l}</span>
  return (
    <span className="mono">
      {b} <Icon name="arrow-right" size={11} /> {l}
    </span>
  )
}

function CompareList({
  title,
  tone,
  icon,
  items,
  currentKeys,
  empty,
  note,
}: {
  title: string
  tone: 'ok' | 'critical' | 'neutral'
  icon: IconName
  items: CompareItem[]
  currentKeys: Set<string>
  empty: string
  note: string
}) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, LIMIT)
  return (
    <section className={`rep-list rep-list--${tone}`} aria-label={`${title}: ${items.length}`}>
      <h3>
        <Icon name={icon} size={14} />
        {title}
        <span className="mono num">{items.length}</span>
      </h3>
      <p className="subtle rep-list__note">{note}</p>
      {items.length === 0 ? (
        <p className="muted rep-list__empty">{empty}</p>
      ) : (
        <ul>
          {shown.map((item) => {
            const linked = currentKeys.has(findingKey(item.finding))
            const tierChanged = item.baselineTier && item.latestTier && item.baselineTier !== item.latestTier
            return (
              <li key={item.key}>
                <div className="rep-item__top">
                  <span className="rep-item__pkg">
                    <span className="mono rep-item__name">{item.name}</span>
                    <span className="subtle">@</span>
                    {versions(item)}
                  </span>
                </div>
                <div className="rep-item__meta">
                  {linked ? (
                    <Link to={findingHref(item.finding)} className="link mono">
                      {item.advisoryId}
                    </Link>
                  ) : (
                    <span className="mono">{item.advisoryId}</span>
                  )}
                  <SeverityBadge severity={item.severity} />
                  {tierChanged ? (
                    <span className="rep-item__tiers">
                      <TierBadge tier={item.baselineTier!} />
                      <Icon name="arrow-right" size={12} />
                      <TierBadge tier={item.latestTier!} />
                    </span>
                  ) : (
                    (item.latestTier ?? item.baselineTier) && <TierBadge tier={(item.latestTier ?? item.baselineTier)!} />
                  )}
                </div>
                <p className="subtle rep-item__sum">{item.summary}</p>
              </li>
            )
          })}
        </ul>
      )}
      {items.length > LIMIT && (
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setAll((a) => !a)} aria-expanded={all}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  )
}
