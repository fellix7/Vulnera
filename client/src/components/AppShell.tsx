import { useEffect, useState, type ReactNode } from 'react'
import { effectiveTier, findingKey } from '../lib/review'
import { aiCounts, formatScanTime } from '../lib/selectors'
import { Link, useLocation } from '../router'
import { useScan } from '../state/store'
import { SourceBadge } from './ui/Badges'
import { Icon, type IconName } from './ui/Icon'
import { Logo } from './ui/Logo'

interface NavItem {
  to: string
  label: string
  icon: IconName
  match: (path: string) => boolean
  count?: (n: Counts) => number | null
  hot?: boolean
}
interface Counts {
  findings: number
  fixNow: number
  ai: number
  plans: number
}

const WORKSPACE: NavItem[] = [
  { to: '/overview', label: 'Overview', icon: 'grid', match: (p) => p === '/overview' },
  {
    to: '/findings',
    label: 'Findings',
    icon: 'list',
    match: (p) => p === '/findings' || p === '/finding',
    count: (n) => n.findings,
  },
  { to: '/evidence', label: 'Code evidence', icon: 'code', match: (p) => p === '/evidence', count: (n) => n.ai },
  { to: '/remediation', label: 'Remediation', icon: 'wrench', match: (p) => p === '/remediation', count: (n) => n.plans },
  { to: '/reports', label: 'Reports & history', icon: 'history', match: (p) => p === '/reports' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useLocation()
  const { current, health, healthFailed, status } = useScan()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const r = current?.result
  const counts: Counts | null = r
    ? {
        findings: r.findings.length,
        fixNow: r.findings.filter((f) => effectiveTier(f, current.review[findingKey(f)]) === 'FIX_NOW').length,
        ai: (() => {
          const c = aiCounts(r.findings)
          return r.findings.length - c.NOT_ASSESSED
        })(),
        plans: r.plans.filter((p) => p.to).length,
      }
    : null

  return (
    <div className="shell">
      <aside className="sidebar" data-open={open} aria-label="Primary">
        <Link to="/" className="sidebar__brand" aria-label="Vulnera home">
          <Logo />
        </Link>
        <div className="sidebar__cta">
          <Link to="/scan" className="btn btn--sm" aria-current={path === '/scan' ? 'page' : undefined}>
            <Icon name="plus" size={14} />
            New scan
            {status === 'scanning' && <span className="spinner" style={{ marginLeft: 'auto', width: 12, height: 12 }} />}
          </Link>
        </div>
        <nav className="nav-group" aria-label="Workspace">
          <span className="eyebrow">Workspace</span>
          {WORKSPACE.map((item) => {
            const n = counts && item.count ? item.count(counts) : null
            return (
              <Link key={item.to} to={item.to} className="nav-link" aria-current={item.match(path) ? 'page' : undefined}>
                <Icon name={item.icon} />
                {item.label}
                {n !== null && n > 0 && <span className="nav-count">{n}</span>}
              </Link>
            )
          })}
        </nav>
        {counts && counts.fixNow > 0 && (
          <nav className="nav-group" aria-label="Shortcuts">
            <span className="eyebrow">Priority</span>
            <Link to="/findings?tier=FIX_NOW" className="nav-link">
              <span className="tier tier--FIX_NOW" style={{ padding: 0, border: 0, background: 'none' }} aria-hidden="true" />
              Fix now
              <span className="nav-count nav-count--hot">{counts.fixNow}</span>
            </Link>
          </nav>
        )}
        <div className="sidebar__foot" aria-label="Service status">
          <span className="status-row">
            <span className={`dot ${healthFailed ? 'dot--bad' : health ? 'dot--ok' : ''}`} />
            {healthFailed ? 'API not reachable' : health ? 'Scan API connected' : 'Checking API…'}
          </span>
          {health && (
            <>
              <span className="status-row">
                <span className={`dot ${health.gemini ? 'dot--ok' : 'dot--warn'}`} />
                {health.gemini ? 'Gemini code check available' : 'Gemini key not configured'}
              </span>
              <span className="status-row">
                <span className={`dot ${health.offline ? 'dot--warn' : 'dot--ok'}`} />
                {health.offline ? 'Offline: saved snapshots' : 'Live OSV · EPSS · KEV data'}
              </span>
            </>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn--ghost btn--icon menu-btn"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="menu" />
          </button>
          {current ? (
            <div className="topbar__ctx">
              <span className="hide-sm">
                <SourceBadge source={current.source} />
              </span>
              <strong className="truncate">{current.projectName}</strong>
              {current.source === 'demo' && <span className="badge badge--accent show-sm">Demo</span>}
              <span className="subtle hide-sm num">
                {current.result.packageCount} packages · {formatScanTime(current.result.scannedAt)}
              </span>
            </div>
          ) : (
            <div className="topbar__ctx">
              <span className="subtle">No scan loaded</span>
            </div>
          )}
          <div className="topbar__actions">
            {path !== '/scan' && (
              <Link to="/scan" className="btn btn--primary btn--sm">
                <Icon name="upload" size={14} />
                <span className="hide-sm">Scan a project</span>
                <span className="sr-only show-sm">Scan a project</span>
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="content page-enter" key={path}>
          {children}
        </main>
      </div>
      {open && <div className="scrim-click" onClick={() => setOpen(false)} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 55 }} />}
    </div>
  )
}
