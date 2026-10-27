import { useEffect, useRef, useState, type RefObject } from 'react'
import { SEVERITY_LABEL, TIER_LABEL, TIER_ORDER } from '../../lib/tiers'
import { SEVERITY_ORDER } from '../../lib/selectors'
import type { Severity } from '../../types'
import { Icon } from '../ui/Icon'
import {
  AI_FILTER_LABEL,
  AI_FILTERS,
  DEP_LABEL,
  DEPS,
  filterChips,
  hasActiveFilters,
  NATURAL_DIR,
  SCOPE_LABEL,
  SCOPES,
  SORT_KEYS,
  SORT_LABEL,
  type Filters,
  type SortKey,
  type View,
} from './filters'

interface Option {
  value: string
  label: string
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  inactiveValue = '',
}: {
  label: string
  value: string
  options: Option[]
  onChange: (v: string) => void
  /** The value that means "no filter"; anything else highlights the control as active. */
  inactiveValue?: string
}) {
  return (
    <label className="fx-sel" data-active={value !== inactiveValue}>
      <span className="fx-sel__label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Single-value options plus the common "Critical + High" preset; a multi-value URL gets its own entry so the select stays truthful. */
function severityOptions(current: Severity[]): Option[] {
  const opts: Option[] = [
    { value: '', label: 'Any' },
    ...SEVERITY_ORDER.map((s) => ({ value: s, label: SEVERITY_LABEL[s] })),
    { value: 'CRITICAL,HIGH', label: 'Critical + High' },
  ]
  const joined = current.join(',')
  if (joined && !opts.some((o) => o.value === joined)) opts.push({ value: joined, label: current.map((s) => SEVERITY_LABEL[s]).join(' + ') })
  return opts
}

function SearchBox({ value, onCommit, inputRef }: { value: string; onCommit: (q: string) => void; inputRef: RefObject<HTMLInputElement | null> }) {
  const [text, setText] = useState(value)
  const committed = useRef(value)
  const timer = useRef<number | undefined>(undefined)

  // The URL changed from elsewhere (chip removed, Clear filters, back/forward): follow it.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value
      setText(value)
    }
  }, [value])
  // Never write to the URL after leaving the page.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function commit(next: string) {
    window.clearTimeout(timer.current)
    const q = next.trim()
    if (q === committed.current) return
    committed.current = q
    onCommit(q)
  }
  function change(next: string) {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(next), 180)
  }

  return (
    <div className="fx-search">
      <Icon name="search" size={14} />
      <input
        ref={inputRef}
        type="search"
        className="input"
        value={text}
        placeholder="Search package, version, advisory, CVE, summary"
        aria-label="Search findings by package, version, advisory id, CVE or summary"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => change(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(text)
          else if (e.key === 'Escape') {
            if (text) {
              setText('')
              commit('')
            } else e.currentTarget.blur()
          }
        }}
      />
      {text ? (
        <button
          type="button"
          className="fx-search__clear"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            commit('')
            inputRef.current?.focus()
          }}
        >
          <Icon name="x" size={12} />
        </button>
      ) : (
        <kbd className="fx-search__kbd" aria-hidden="true">
          /
        </kbd>
      )}
    </div>
  )
}

interface Props {
  filters: Filters
  view: View
  searchRef: RefObject<HTMLInputElement | null>
  onChange: (patch: Partial<Filters>) => void
  onClear: () => void
}

export function FindingsToolbar({ filters, view, searchRef, onChange, onClear }: Props) {
  const active = hasActiveFilters(filters)
  const chips = filterChips(filters)
  const shown = view.rows.length
  // Narrow screens tuck the dropdown filters behind a toggle; search, tiers and active chips stay visible.
  const [open, setOpen] = useState(false)
  const hiddenCount = filters.severity.length + Number(!!filters.scope) + Number(!!filters.dep) + Number(!!filters.ai) + Number(filters.kev)

  // "/" focuses search unless the user is already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchRef])

  return (
    <div className="fx-toolbar">
      <div className="fx-toolbar__top">
        <SearchBox value={filters.q} onCommit={(q) => onChange({ q })} inputRef={searchRef} />

        <div className="seg fx-tiers" role="group" aria-label="Priority tier">
          <button type="button" aria-pressed={filters.tier.length === 0} onClick={() => onChange({ tier: [] })}>
            All <span className="count">{view.baseTotal}</span>
          </button>
          {TIER_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              data-tier={t}
              aria-pressed={filters.tier.includes(t)}
              onClick={() => onChange({ tier: filters.tier.length === 1 && filters.tier[0] === t ? [] : [t] })}
            >
              <i className="fx-mark" aria-hidden="true" />
              {TIER_LABEL[t]} <span className="count">{view.tierCounts[t]}</span>
            </button>
          ))}
        </div>

        <FilterSelect
          label="Sort"
          value={filters.sort}
          inactiveValue="priority"
          options={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABEL[k] }))}
          onChange={(v) => onChange({ sort: v as SortKey, dir: NATURAL_DIR[v as SortKey] })}
        />

        <button
          type="button"
          className="btn fx-filters-toggle"
          aria-expanded={open}
          aria-controls="fx-filters"
          data-active={hiddenCount > 0}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="cluster">
            <Icon name="filter" size={14} />
            Filters
            {hiddenCount > 0 && <span className="fx-filters-toggle__n num">{hiddenCount}</span>}
          </span>
          <Icon name="chevron-down" size={14} className={open ? 'fx-flip' : undefined} />
        </button>
      </div>

      <div className="fx-toolbar__filters" id="fx-filters" data-open={open} role="group" aria-label="Filters">
        <FilterSelect
          label="Severity"
          value={filters.severity.join(',')}
          options={severityOptions(filters.severity)}
          onChange={(v) => onChange({ severity: v ? (v.split(',') as Severity[]) : [] })}
        />
        <FilterSelect
          label="Scope"
          value={filters.scope ?? ''}
          options={[{ value: '', label: 'Any' }, ...SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))]}
          onChange={(v) => onChange({ scope: (v || null) as Filters['scope'] })}
        />
        <FilterSelect
          label="Dependency"
          value={filters.dep ?? ''}
          options={[{ value: '', label: 'Any' }, ...DEPS.map((d) => ({ value: d, label: DEP_LABEL[d] }))]}
          onChange={(v) => onChange({ dep: (v || null) as Filters['dep'] })}
        />
        <FilterSelect
          label="AI verdict"
          value={filters.ai ?? ''}
          options={[{ value: '', label: 'Any' }, ...AI_FILTERS.map((a) => ({ value: a, label: AI_FILTER_LABEL[a] }))]}
          onChange={(v) => onChange({ ai: (v || null) as Filters['ai'] })}
        />
        <label className="check fx-check" data-active={filters.kev}>
          <input type="checkbox" checked={filters.kev} onChange={(e) => onChange({ kev: e.target.checked })} />
          KEV only
        </label>
      </div>

      <div className="fx-toolbar__meta">
        <p className="fx-count" role="status">
          {active ? (
            <>
              Showing <strong className="num">{shown}</strong> of <span className="num">{view.total}</span> {view.total === 1 ? 'finding' : 'findings'}
            </>
          ) : (
            <>
              Showing all <strong className="num">{view.total}</strong> {view.total === 1 ? 'finding' : 'findings'}
            </>
          )}
        </p>
        {chips.length > 0 && (
          <ul className="fx-chips" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.id}>
                <button type="button" className="fx-chip" onClick={() => onChange(c.patch)} aria-label={`Remove filter ${c.label}`}>
                  {c.label}
                  <Icon name="x" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {active && (
          <button type="button" className="btn btn--ghost btn--sm fx-clear" onClick={onClear}>
            <Icon name="x" size={12} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
