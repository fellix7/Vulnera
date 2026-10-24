import { useEffect, useRef, useState } from 'react'
import { effectiveTier, findingKey } from '../../lib/review'
import { formatScanTime } from '../../lib/selectors'
import { Link, navigate } from '../../router'
import { useScan, type ScanRecord } from '../../state/store'
import { SourceBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Kit'
import { AiStatusTag } from './AiStatusTag'

interface Props {
  /** Saved scans, newest first (demo data is never in here). */
  scans: ScanRecord[]
  currentId: string | null
  picked: string[]
  onTogglePick: (id: string) => void
  onCompareSelected: () => void
}

const fixNowCount = (r: ScanRecord) =>
  r.result.findings.filter((f) => effectiveTier(f, r.review[findingKey(f)]) === 'FIX_NOW').length

export function History({ scans, currentId, picked, onTogglePick, onCompareSelected }: Props) {
  const { openScan, deleteScan, clearHistory } = useScan()
  // 'all' = clear history is awaiting confirmation; otherwise the id of the scan awaiting delete confirmation.
  const [confirm, setConfirm] = useState<string | 'all' | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  // A pending confirmation expires, and Escape cancels it.
  useEffect(() => {
    if (!confirm) return
    const t = window.setTimeout(() => setConfirm(null), 6000)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirm(null)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [confirm])

  function open(id: string) {
    openScan(id)
    navigate('/overview')
  }

  function remove(id: string) {
    deleteScan(id)
    setConfirm(null)
    heading.current?.focus()
  }

  function clearAll() {
    clearHistory()
    setConfirm(null)
    heading.current?.focus()
  }

  const full = picked.length >= 2

  return (
    <section className="panel" aria-labelledby="rep-history-h">
      <div className="panel__head">
        <h2 id="rep-history-h" ref={heading} tabIndex={-1}>
          Scan history
          {scans.length > 0 && <span className="subtle num rep-count"> {scans.length}</span>}
        </h2>
        {scans.length > 0 && (
          <div className="cluster">
            <button
              type="button"
              className={`btn btn--sm ${confirm === 'all' ? 'btn--danger' : 'btn--ghost'}`}
              onClick={() => (confirm === 'all' ? clearAll() : setConfirm('all'))}
            >
              <Icon name="trash" size={14} />
              {confirm === 'all' ? `Confirm: clear ${scans.length} ${scans.length === 1 ? 'scan' : 'scans'}` : 'Clear history'}
            </button>
            {confirm === 'all' && (
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      <p className="rep-note subtle">
        Saved only in this browser (local storage); nothing is uploaded. Findings, including quoted code snippets from AI citations, are stored locally. The source
        files you upload are not. Only recent scans are kept, and demo data is never saved.
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        {confirm ? 'Press the confirm button to delete, or Escape to cancel.' : ''}
      </span>

      {scans.length === 0 ? (
        <EmptyState
          icon="history"
          title="No saved scans yet"
          actions={
            <Link to="/scan" className="btn btn--primary">
              <Icon name="upload" size={14} />
              Scan a project
            </Link>
          }
        >
          Each scan you run is saved here, in this browser only, so you can reopen it or compare it with a later scan.
        </EmptyState>
      ) : (
        <>
          <div className="rep-hist">
            <div className="table-wrap">
              <table className="dtable rep-table" role="table">
                <caption className="sr-only">Saved scans, newest first</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">Project</th>
                    <th scope="col" role="columnheader">Source</th>
                    <th scope="col" role="columnheader">Scanned</th>
                    <th scope="col" role="columnheader" className="num">
                      Packages
                    </th>
                    <th scope="col" role="columnheader" className="num">
                      Findings
                    </th>
                    <th scope="col" role="columnheader" className="num">
                      Fix now
                    </th>
                    <th scope="col" role="columnheader">AI check</th>
                    <th scope="col" role="columnheader">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {scans.map((r) => {
                    const isCurrent = r.id === currentId
                    const isPicked = picked.includes(r.id)
                    const when = formatScanTime(r.result.scannedAt)
                    const fixNow = fixNowCount(r)
                    return (
                      <tr key={r.id} role="row" className={isCurrent ? 'is-current' : undefined}>
                        <th scope="row" role="rowheader" className="rep-projcell">
                          <div className="rep-proj">
                            <label className="check rep-proj__pick">
                              <input type="checkbox" checked={isPicked} disabled={!isPicked && full} onChange={() => onTogglePick(r.id)} />
                              <span className="sr-only">
                                Select {r.projectName}, {when}, to compare
                              </span>
                            </label>
                            <div className="rep-proj__txt">
                              <span className="rep-proj__line">
                                <span className="rep-proj__name">{r.projectName}</span>
                                {isCurrent && <span className="badge badge--accent">Current</span>}
                              </span>
                              {r.fileName && <span className="subtle mono rep-proj__file">{r.fileName}</span>}
                            </div>
                          </div>
                        </th>
                        <td role="cell" data-label="Source">
                          <SourceBadge source={r.source} />
                        </td>
                        <td role="cell" data-label="Scanned" className="num">
                          {when}
                        </td>
                        <td role="cell" data-label="Packages" className="num mono">
                          {r.result.packageCount}
                        </td>
                        <td role="cell" data-label="Findings" className="num mono">
                          {r.result.findings.length}
                        </td>
                        <td role="cell" data-label="Fix now" className="num mono">
                          {fixNow > 0 ? <span className="rep-hot">{fixNow}</span> : fixNow}
                        </td>
                        <td role="cell" data-label="AI check">
                          <AiStatusTag result={r.result} />
                        </td>
                        <td role="cell" data-label="Actions" className="rep-actions">
                          <button type="button" className="btn btn--sm" onClick={() => open(r.id)}>
                            Open<span className="sr-only"> {r.projectName}, {when}</span>
                          </button>
                          <button
                            type="button"
                            className={`btn btn--sm ${confirm === r.id ? 'btn--danger' : 'btn--ghost'}`}
                            onClick={() => (confirm === r.id ? remove(r.id) : setConfirm(r.id))}
                          >
                            <Icon name="trash" size={14} />
                            {confirm === r.id ? 'Confirm delete' : 'Delete'}
                            <span className="sr-only">
                              {' '}
                              {r.projectName}, {when}
                            </span>
                          </button>
                          {confirm === r.id && (
                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirm(null)}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rep-pickbar">
            <p className="muted" aria-live="polite">
              {picked.length === 2
                ? '2 of 2 scans selected. Untick one to pick a different scan.'
                : `Tick two scans to compare them (${picked.length} of 2 selected).`}
            </p>
            <button type="button" className="btn btn--sm" disabled={picked.length !== 2} onClick={onCompareSelected}>
              <Icon name="compare" size={14} />
              Compare selected
            </button>
          </div>
        </>
      )}
    </section>
  )
}
