import { memo, type MouseEvent } from 'react'
import { navigate } from '../../router'
import { EpssMeter, SeverityBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { AdvisoryCell, FixCell, KevCell, PackageCell, PriorityCell, TierGroupHead } from './cells'
import { SORT_LABEL, type Filters, type Group, type Row, type SortableCol } from './filters'

const COLS = 8

function SortTh({ col, filters, onSort }: { col: SortableCol; filters: Filters; onSort: (col: SortableCol) => void }) {
  const active = filters.sort === col
  const ariaSort = active ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" className="fx-th-btn" data-active={active} onClick={() => onSort(col)} title={`Sort by ${SORT_LABEL[col].toLowerCase()}`}>
        {SORT_LABEL[col]}
        <Icon name={active ? 'arrow-down' : 'sort'} size={12} className={active && filters.dir === 'asc' ? 'fx-th-btn__asc' : undefined} />
      </button>
    </th>
  )
}

const FindingRow = memo(function FindingRow({ row }: { row: Row }) {
  const { f } = row

  // The package link is the keyboard target; this makes the rest of the row clickable for mouse users.
  function onClick(e: MouseEvent<HTMLTableRowElement>) {
    if (e.defaultPrevented || e.button !== 0) return
    if ((e.target as HTMLElement).closest('a, button, input, select, textarea')) return
    if (window.getSelection()?.toString()) return
    if (e.metaKey || e.ctrlKey) window.open(row.href, '_blank', 'noopener')
    else navigate(row.href)
  }

  return (
    <tr className={`fx-row fx-row--${row.tier}`} onClick={onClick}>
      <td className="fx-c-first">
        <PriorityCell row={row} />
      </td>
      <th scope="row" className="fx-rowhead">
        <PackageCell row={row} />
      </th>
      <td className="fx-adv">
        <AdvisoryCell row={row} />
      </td>
      <td>
        <SeverityBadge severity={f.advisory.severity} />
      </td>
      <td>
        <EpssMeter epss={f.enrichment.epss} />
      </td>
      <td>
        <KevCell kev={f.enrichment.kev} />
      </td>
      <td>
        <VerdictBadge verdict={row.ai} />
      </td>
      <td className="fx-c-last">
        <FixCell plan={row.plan} />
      </td>
    </tr>
  )
})

function GroupBody({ group }: { group: Group }) {
  return (
    <tbody>
      {group.tier && (
        <tr className="fx-group">
          <th colSpan={COLS} scope="rowgroup">
            <TierGroupHead tier={group.tier} count={group.rows.length} />
          </th>
        </tr>
      )}
      {group.tier && group.rows.length === 0 && (
        <tr className="fx-group-empty">
          <td colSpan={COLS}>No findings in this tier.</td>
        </tr>
      )}
      {group.rows.map((row) => (
        <FindingRow key={row.rank} row={row} />
      ))}
    </tbody>
  )
}

interface Props {
  groups: Group[]
  filters: Filters
  shown: number
  total: number
  onSort: (col: SortableCol) => void
}

export function FindingsTable({ groups, filters, shown, total, onSort }: Props) {
  const sortText =
    filters.sort === 'priority'
      ? 'default priority order'
      : `${SORT_LABEL[filters.sort].toLowerCase()}, ${filters.dir === 'asc' ? 'ascending' : 'descending'}`
  return (
    <div className="table-wrap fx-table-wrap">
      <table className="dtable fx-table">
        <caption className="sr-only">
          Findings: {shown} of {total} shown, sorted by {sortText}. Severity, EPSS and Package headers are buttons that change the sort.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="fx-c-first">
              Priority
            </th>
            <SortTh col="package" filters={filters} onSort={onSort} />
            <th scope="col">Advisory</th>
            <SortTh col="severity" filters={filters} onSort={onSort} />
            <SortTh col="epss" filters={filters} onSort={onSort} />
            <th scope="col">KEV</th>
            <th scope="col">AI verdict</th>
            <th scope="col" className="fx-c-last">
              Fix
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <GroupBody key={g.tier ?? 'all'} group={g} />
        ))}
      </table>
    </div>
  )
}
