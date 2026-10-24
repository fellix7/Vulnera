import { useMemo } from 'react'
import { findingHref } from '../../lib/selectors'
import { Link } from '../../router'
import type { ScanRecord } from '../../state/store'
import { TierBadge, VerdictBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { reviewerDecisions } from './scanDiff'

/** Human decisions on the current scan: confirmed or disputed AI verdicts and lowered tiers. */
export function EvidenceLog({ current }: { current: ScanRecord }) {
  const { result, review } = current
  const decisions = useMemo(() => reviewerDecisions(result.findings, review), [result, review])

  return (
    <section className="panel" aria-labelledby="rep-evidence-h">
      <div className="panel__head">
        <h2 id="rep-evidence-h">
          Evidence log
          {decisions.length > 0 && <span className="subtle num rep-count"> {decisions.length}</span>}
        </h2>
      </div>
      <p className="rep-note subtle">
        Decisions a reviewer made on this scan. They are saved with the scan in this browser and written to the Markdown and JSON exports. No name or timestamp is
        recorded, and the AI never makes these decisions.
      </p>
      {decisions.length === 0 ? (
        <div className="rep-evidence-empty">
          <span className="empty__icon">
            <Icon name="eye" />
          </span>
          <div>
            <p>
              <strong>No reviewer decisions yet</strong>
            </p>
            <p className="muted">
              Open a finding to confirm or dispute an AI verdict, or to lower its priority by one tier. Known exploited (KEV) findings cannot be lowered.
            </p>
            <p>
              <Link to="/findings" className="btn btn--sm">
                <Icon name="list" size={14} />
                Go to findings
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <ul className="rep-log">
          {decisions.map((d) => (
            <li key={`${d.finding.pkg.name}@${d.finding.pkg.version}#${d.finding.advisory.id}`}>
              <div className="rep-log__main">
                <Link to={findingHref(d.finding)} className="link rep-log__pkg">
                  <span className="mono">
                    {d.finding.pkg.name}@{d.finding.pkg.version}
                  </span>
                  <span className="subtle"> · </span>
                  <span className="mono">{d.finding.advisory.id}</span>
                </Link>
                <p className="subtle rep-log__sum">{d.finding.advisory.summary}</p>
              </div>
              <div className="rep-log__what">
                {d.ai && d.finding.ai && (
                  <span className="rep-log__row">
                    <VerdictBadge verdict={d.finding.ai.verdict} />
                    <Icon name="arrow-right" size={12} />
                    {d.ai === 'confirmed' ? (
                      <span className="badge badge--ok">
                        <Icon name="thumb-up" size={12} />
                        Reviewer confirmed
                      </span>
                    ) : (
                      <span className="badge badge--warn">
                        <Icon name="thumb-down" size={12} />
                        Reviewer disputed
                      </span>
                    )}
                  </span>
                )}
                {d.lowered && (
                  <span className="rep-log__row">
                    <span className="subtle">Tier lowered</span>
                    <TierBadge tier={d.originalTier} />
                    <Icon name="arrow-right" size={12} />
                    <TierBadge tier={d.effectiveTier} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
