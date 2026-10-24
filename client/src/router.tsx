import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

// Tiny path router (History API). Vite dev/preview serve index.html for unknown paths.
// Routes:
//   /            landing          /overview     dashboard
//   /scan        new scan         /findings     explorer (query: tier, severity, scope, dep, ai, kev, q, sort)
//   /finding     detail (?key=)   /evidence     code evidence
//   /remediation fix plan         /reports      history, compare, export

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
window.addEventListener('popstate', notify)

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => window.location.pathname + window.location.search

export function navigate(to: string, opts?: { replace?: boolean; keepScroll?: boolean }) {
  if (to === snapshot()) return
  if (opts?.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  const hash = new URL(to, window.location.origin).hash.slice(1)
  if (!opts?.keepScroll && !hash) window.scrollTo({ top: 0 })
  notify()
  // Links like /#how-it-works: scroll once the target page has rendered.
  if (hash) window.setTimeout(() => document.getElementById(decodeURIComponent(hash))?.scrollIntoView(), 60)
}

export interface Location {
  path: string
  search: URLSearchParams
}

export function useLocation(): Location {
  const href = useSyncExternalStore(subscribe, snapshot)
  const url = new URL(href, window.location.origin)
  return { path: url.pathname.replace(/\/+$/, '') || '/', search: url.searchParams }
}

/** Replace the query string of the current path without adding a history entry. */
export function setSearch(params: URLSearchParams) {
  const qs = params.toString()
  navigate(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { replace: true, keepScroll: true })
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }

export function Link({ to, onClick, ...rest }: LinkProps) {
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (rest.target && rest.target !== '_self') return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handle} {...rest} />
}
