import { Link } from '../../router'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { goToSection } from './scroll'

const APP_LINKS = [
  { to: '/scan', label: 'Scan a project' },
  { to: '/overview', label: 'Overview' },
  { to: '/findings', label: 'Findings' },
  { to: '/remediation', label: 'Remediation' },
  { to: '/reports', label: 'Reports' },
]

const SOURCES = [
  { href: 'https://osv.dev', label: 'OSV.dev', note: 'Vulnerability matching' },
  { href: 'https://www.first.org/epss/', label: 'FIRST EPSS', note: 'Exploit probability' },
  { href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', label: 'CISA KEV', note: 'Known exploited' },
]

function External({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="lp-foot__ext">
      {children}
      <Icon name="arrow-up-right" size={12} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

export function LandingFooter() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap">
        <div className="lp-foot__grid">
          <div className="lp-foot__brand">
            <a href="#top" aria-label="Vulnera, back to top" onClick={(e) => goToSection(e, 'top')}>
              <Logo />
            </a>
            <p className="muted">
              Dependency risk triage for Node.js. Reads a package-lock.json, checks whether your code reaches the vulnerable function, and
              produces an evidence-backed, verified upgrade plan.
            </p>
          </div>

          <nav aria-label="App" className="lp-foot__col">
            <p className="eyebrow">App</p>
            <ul>
              {APP_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lp-foot__col">
            <p className="eyebrow">Data sources</p>
            <ul>
              {SOURCES.map((s) => (
                <li key={s.href}>
                  <External href={s.href}>{s.label}</External>
                  <span className="subtle"> {s.note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-foot__col">
            <p className="eyebrow">Project</p>
            <ul>
              <li>
                <External href="https://github.com/fellix7/Vulnera">GitHub repository</External>
              </li>
            </ul>
          </div>
        </div>

        <div className="lp-foot__base">
          <p>Built for Tech Yuva × GDG Gurugram Build-a-thon 2026 (PS-09)</p>
          <p className="subtle">Demo data shown on this page is illustrative, not a real scan.</p>
        </div>
      </div>
    </footer>
  )
}
