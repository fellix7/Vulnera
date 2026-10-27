import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText } from '../../lib/download'
import { Link } from '../../router'
import { useScan } from '../../state/store'
import { Icon, type IconName } from './Icon'

export function CopyButton({ text, label = 'Copy', className = 'btn btn--ghost btn--sm' }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function onClick() {
    const ok = await copyText(text)
    setState(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1600)
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-label={state === 'idle' ? `${label}: ${text}` : undefined}>
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={14} />
      <span>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}</span>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}

/** Shell command with a copy button. Non-shell snippets (e.g. JSON override text) pass prompt={false}. */
export function CommandBlock({ command, prompt = true }: { command: string; prompt?: boolean }) {
  return (
    <div className="cmd">
      {prompt && <span className="cmd__prompt" aria-hidden="true">$</span>}
      <pre>
        <code>{command}</code>
      </pre>
      <span className="cmd__copy">
        <CopyButton text={command} />
      </span>
    </div>
  )
}

type Tone = 'info' | 'warn' | 'danger' | 'ok' | 'ai' | 'demo'
const TONE_ICON: Record<Tone, IconName> = {
  info: 'info',
  warn: 'alert',
  danger: 'alert',
  ok: 'shield-check',
  ai: 'sparkle',
  demo: 'beaker',
}

export function Callout({ tone = 'info', children, role }: { tone?: Tone; children: ReactNode; role?: 'alert' | 'status' | 'note' }) {
  return (
    <div className={`callout callout--${tone}`} role={role}>
      <Icon name={TONE_ICON[tone]} />
      <div>{children}</div>
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="cluster">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon = 'search', title, children, actions }: { icon?: IconName; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {actions && <div className="cluster">{actions}</div>}
    </div>
  )
}

/** Shown by app pages when no scan is loaded. */
export function NoScan({ what = 'this view' }: { what?: string }) {
  const { loadDemo } = useScan()
  return (
    <div className="panel">
      <EmptyState
        icon="layers"
        title="No scan loaded"
        actions={
          <>
            <Link to="/scan" className="btn btn--primary">
              <Icon name="upload" size={14} />
              Scan a project
            </Link>
            <button type="button" className="btn" onClick={loadDemo}>
              <Icon name="beaker" size={14} />
              Explore demo data
            </button>
          </>
        }
      >
        Upload a package-lock.json to populate {what}, or open the clearly labelled demo data.
      </EmptyState>
    </div>
  )
}
