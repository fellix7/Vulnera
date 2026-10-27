import { useCallback, useDeferredValue, useMemo, useRef } from 'react'
import { FindingsCards } from '../components/findings/FindingsCards'
import { FindingsLegend } from '../components/findings/FindingsLegend'
import { FindingsTable } from '../components/findings/FindingsTable'
import { FindingsToolbar } from '../components/findings/FindingsToolbar'
import {
  buildRows,
  buildView,
  EMPTY_FILTERS,
  filtersToParams,
  NATURAL_DIR,
  parseFilters,
  type Filters,
  type SortableCol,
} from '../components/findings/filters'
import { useMediaQuery } from '../components/findings/useMediaQuery'
import { Callout, EmptyState, NoScan, PageHeader } from '../components/ui/Kit'
import { formatScanTime } from '../lib/selectors'
import { setSearch, useLocation } from '../router'
import { useScan, type ScanRecord } from '../state/store'
import './findings.css'

/** Read the live URL (not a render closure) so debounced search commits never overwrite newer changes. */
function updateFilters(patch: Partial<Filters>) {
  const base = new URLSearchParams(window.location.search)
  setSearch(filtersToParams({ ...parseFilters(base), ...patch }, base))
}

const clearFilters = () => updateFilters(EMPTY_FILTERS)

function sortByColumn(col: SortableCol) {
  const cur = parseFilters(new URLSearchParams(window.location.search))
  if (cur.sort !== col) updateFilters({ sort: col, dir: NATURAL_DIR[col] })
  else if (cur.dir === NATURAL_DIR[col]) updateFilters({ dir: cur.dir === 'asc' ? 'desc' : 'asc' })
  else updateFilters({ sort: 'priority', dir: NATURAL_DIR.priority }) // third click returns to the default order
}

function Explorer({ record }: { record: ScanRecord }) {
  const { result, review } = record
  const { search } = useLocation()
  const qs = search.toString()
  const filters = useMemo(() => parseFilters(new URLSearchParams(qs)), [qs])
  // Controls follow the URL immediately; the (larger) table render may lag a frame behind while typing.
  const deferred = useDeferredValue(filters)

  const rows = useMemo(() => buildRows(result, review), [result, review])
  const view = useMemo(() => buildView(rows, deferred), [rows, deferred])
  const narrow = useMediaQuery('(max-width: 759.98px)')
  const searchRef = useRef<HTMLInputElement | null>(null)
  const onSort = useCallback((col: SortableCol) => sortByColumn(col), [])

  const stats = `${record.projectName} · ${result.findings.length} ${result.findings.length === 1 ? 'finding' : 'findings'} in ${result.packageCount} packages · scanned ${formatScanTime(result.scannedAt)}`

  return (
    <>
      <PageHeader
        eyebrow="Findings explorer"
        title="Findings"
        description={
          <>
            Every vulnerability the scan found, ranked by why it matters. Search, filter and sort freely; nothing is hidden.
            <span className="fx-stats">{stats}</span>
          </>
        }
      />

      <div className="fx">
        {record.source === 'demo' && (
          <Callout tone="demo">
            <strong>Demo data.</strong> These findings are illustrative and were not produced by scanning your project.
          </Callout>
        )}
        {result.aiStatus === 'error' && (
          <Callout tone="warn">
            The AI code check failed for this scan, so AI verdicts are missing. Findings without a verdict are not assumed safe.
          </Callout>
        )}

        {result.findings.length === 0 ? (
          <div className="panel">
            <EmptyState icon="shield-check" title={`No known vulnerabilities in ${result.packageCount} ${result.packageCount === 1 ? 'package' : 'packages'}`}>
              Every package in the lockfile was looked up in OSV.dev and no advisory matched. This reflects advisory data at scan time; new
              advisories can appear later.
            </EmptyState>
          </div>
        ) : (
          <section className="fx-panel" aria-label="Findings explorer">
            <FindingsToolbar filters={filters} view={view} searchRef={searchRef} onChange={updateFilters} onClear={clearFilters} />
            {view.rows.length === 0 ? (
              <EmptyState
                icon="filter"
                title="No findings match these filters"
                actions={
                  <button type="button" className="btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              >
                The scan has {view.total} {view.total === 1 ? 'finding' : 'findings'}; none of them match the current search and filters.
              </EmptyState>
            ) : narrow ? (
              <FindingsCards groups={view.groups} />
            ) : (
              <FindingsTable groups={view.groups} filters={filters} shown={view.rows.length} total={view.total} onSort={onSort} />
            )}
          </section>
        )}

        {result.findings.length > 0 && <FindingsLegend />}
      </div>
    </>
  )
}

export default function FindingsPage() {
  const { current } = useScan()
  if (!current)
    return (
      <>
        <PageHeader eyebrow="Findings explorer" title="Findings" description="Search, filter and sort every vulnerability a scan found." />
        <NoScan what="the findings explorer" />
      </>
    )
  return <Explorer record={current} />
}
