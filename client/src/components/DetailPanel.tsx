import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { Finding, UpgradePlan } from '../types'
import { depPath, formatEpss, safeHttpUrl } from '../lib/format'
import { canLower, effectiveTier, isLowered, type AiDecision, type Review } from '../lib/review'
import { TIER_LABEL } from '../lib/tiers'
import { EpssBadge, KevBadge, SeverityBadge, TierBadge, VERDICT_LONG, VerdictBadge } from './Badges'
import { UpgradePlanView } from './UpgradePlanView'

interface Props {
  finding: Finding
  plan: UpgradePlan | undefined
  review: Review | undefined
  onChange: (next: Review) => void
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function DetailPanel({ finding: f, plan, review, onChange, onClose }: Props) {
  const panel = useRef<HTMLElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const tier = effectiveTier(f, review)
  const lowered = isLowered(f, review)
  const isKev = f.enrichment.kev === true
  const lowerable = canLower(f, review)

  // Focus the panel on open and restore focus to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // no background scroll behind the drawer
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function setAi(decision: AiDecision) {
    onChange({ ...review, ai: review?.ai === decision ? undefined : decision })
  }

  const path = depPath(f.pkg.path, f.pkg.name)
  const refs = f.advisory.references.map((raw) => ({ raw, url: safeHttpUrl(raw) }))

  return (
    <div className="drawer-wrap">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onKeyDown={onKeyDown}
      >
        <div className="drawer-head">
          <div>
            <h2 id="detail-title">
              {f.pkg.name}
              <span className="ver">@{f.pkg.version}</span>
            </h2>
            <p className="row-id">
              {f.advisory.id}
              {f.advisory.aliases.length > 0 && ` · ${f.advisory.aliases.join(', ')}`}
            </p>
          </div>
          <button ref={closeBtn} type="button" className="btn small" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="row-badges">
          <TierBadge tier={tier} />
          {lowered && <span className="badge lowered">Lowered by reviewer (was {TIER_LABEL[f.tier]})</span>}
          <SeverityBadge severity={f.advisory.severity} />
          <EpssBadge epss={f.enrichment.epss} />
          {isKev && <KevBadge />}
          <span className="badge neutral">{f.pkg.dev ? 'Development only' : 'Production'}</span>
          <span className="badge neutral">{f.pkg.direct ? 'Direct' : 'Transitive'}</span>
        </div>

        <section className="d-sec">
          <h3>Why this priority</h3>
          {f.reasons.length ? (
            <ul className="reasons">
              {f.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No reasons were returned.</p>
          )}
        </section>

        <section className="d-sec">
          <h3>Advisory</h3>
          <p className="summary-text">{f.advisory.summary}</p>
          {f.advisory.details && <pre className="plain">{f.advisory.details}</pre>}
          <p className="muted small-text">Advisory text is untrusted input from OSV.dev and is shown as plain text.</p>
        </section>

        <section className="d-sec">
          <h3>Dependency path</h3>
          <ol className="path" aria-label={path.join(' then ')}>
            {path.map((p, i) => (
              <li key={`${p}-${i}`} className={i === path.length - 1 ? 'last' : ''}>
                {p}
              </li>
            ))}
          </ol>
        </section>

        <section className="d-sec">
          <h3>Exploitation data</h3>
          <dl className="kv">
            <dt>EPSS (30-day exploit probability)</dt>
            <dd>{f.enrichment.epss === null ? 'No data (shown as unknown, not zero)' : formatEpss(f.enrichment.epss)}</dd>
            <dt>CISA Known Exploited</dt>
            <dd>
              {f.enrichment.kev === true
                ? 'Yes, on the KEV catalogue'
                : f.enrichment.kev === false
                  ? 'Not listed'
                  : 'Not checked (no CVE id)'}
            </dd>
            <dt>Fixed versions</dt>
            <dd>{f.advisory.fixedVersions.length ? f.advisory.fixedVersions.join(', ') : 'None published'}</dd>
          </dl>
        </section>

        <section className="d-sec">
          <h3>AI code check</h3>
          {f.ai ? (
            <>
              <p>
                <VerdictBadge verdict={f.ai.verdict} /> <span className="muted">{VERDICT_LONG[f.ai.verdict]}</span>
                {review?.ai && (
                  <span className={`badge decision ${review.ai}`}>Reviewer {review.ai} this verdict</span>
                )}
              </p>
              <p>{f.ai.reasoning}</p>
              {f.ai.citations.length > 0 ? (
                <ul className="cites">
                  {f.ai.citations.map((c, i) => (
                    <li key={i}>
                      <div className="cite-loc">
                        {c.file}:{c.line}
                      </div>
                      <pre className="code">
                        <code>{c.quote}</code>
                      </pre>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No code citations.</p>
              )}
              <p className="muted small-text">
                AI assessments need human confirmation. Citations are checked against your files before being shown.
              </p>
            </>
          ) : (
            <p className="muted">No AI assessment for this finding (AI only reviews the top direct-dependency findings).</p>
          )}
        </section>

        <section className="d-sec">
          <h3>Upgrade plan</h3>
          <UpgradePlanView plan={plan} />
        </section>

        <section className="d-sec">
          <h3>Human review</h3>
          <div className="actions wrap">
            {f.ai && (
              <>
                <button
                  type="button"
                  className="btn"
                  aria-pressed={review?.ai === 'confirmed'}
                  onClick={() => setAi('confirmed')}
                >
                  {review?.ai === 'confirmed' ? 'Verdict confirmed' : 'Confirm AI verdict'}
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-pressed={review?.ai === 'disputed'}
                  onClick={() => setAi('disputed')}
                >
                  {review?.ai === 'disputed' ? 'Verdict disputed' : 'Dispute AI verdict'}
                </button>
              </>
            )}
            {lowered ? (
              <button type="button" className="btn" onClick={() => onChange({ ...review, lowered: false })}>
                Restore original priority
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={!lowerable}
                title={isKev ? 'KEV findings can never be lowered' : !lowerable ? 'Already in the lowest tier' : undefined}
                aria-describedby="lower-hint"
                onClick={() => onChange({ ...review, lowered: true })}
              >
                Lower priority
              </button>
            )}
          </div>
          <p id="lower-hint" className="muted small-text">
            {isKev
              ? 'KEV findings can never be lowered: this vulnerability is known to be exploited.'
              : 'Lowering moves this finding down one tier. Only a person can do this; it is kept in this browser session and included in exports.'}
          </p>
        </section>

        <section className="d-sec">
          <h3>References</h3>
          {refs.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="refs">
              {refs.map(({ raw, url }, i) => (
                <li key={i}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                  ) : (
                    <span className="muted" title="Not an http(s) link, so it is not clickable">
                      {raw}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
