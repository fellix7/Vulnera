import { useEffect, useState } from 'react'
import { Link } from '../../router'
import { Logo } from '../ui/Logo'
import { goToSection } from './scroll'

const SECTION_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'why', label: 'Why Vulnera' },
  { id: 'who', label: "Who it's for" },
  { id: 'roadmap', label: 'Roadmap' },
] as const

/** Id of the section currently crossing a band near the top of the viewport (null when none of the nav sections). */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        setActive(ids.find((id) => visible.has(id)) ?? null)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [ids])
  return active
}

const SECTION_IDS = SECTION_LINKS.map((l) => l.id)

export function LandingNav() {
  const active = useActiveSection(SECTION_IDS)
  return (
    <header className="lp-nav">
      <nav className="lp-wrap lp-nav__inner" aria-label="Primary">
        <a href="#top" className="lp-nav__brand" aria-label="Vulnera, back to top" onClick={(e) => goToSection(e, 'top')}>
          <Logo />
        </a>
        <ul className="lp-nav__links">
          {SECTION_LINKS.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} aria-current={active === l.id ? 'location' : undefined} onClick={(e) => goToSection(e, l.id)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="lp-nav__actions">
          <Link to="/overview" className="btn btn--ghost lp-nav__open">
            Open app
          </Link>
          <Link to="/scan" className="btn btn--primary">
            Scan a project
          </Link>
        </div>
      </nav>
    </header>
  )
}
