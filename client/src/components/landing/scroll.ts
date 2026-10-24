import type { MouseEvent } from 'react'

/**
 * In-page link handler: smooth-scrolls to a section (instantly when the user prefers reduced motion), updates the
 * hash without touching the path router, and moves focus to the section so the next Tab continues from there.
 * Modified clicks and unknown ids fall through to the browser's native anchor behaviour.
 */
export function goToSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const { pathname, search } = window.location
  window.history.replaceState(null, '', id === 'top' ? `${pathname}${search}` : `${pathname}${search}#${id}`)
  if (id !== 'top') {
    el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }
}
