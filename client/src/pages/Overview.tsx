import { ActionTiers } from '../components/overview/ActionTiers'
import { Breakdowns } from '../components/overview/Breakdowns'
import { FixPlanGlance } from '../components/overview/FixPlanGlance'
import { Funnel } from '../components/overview/Funnel'
import { computePosture } from '../components/overview/posture'
import { UrgentList } from '../components/overview/UrgentList'
import { SourceBadge } from '../components/ui/Badges'
import { Icon, type IconName } from '../components/ui/Icon'
import { Callout, NoScan, PageHeader } from '../components/ui/Kit'
import { formatScanTime } from '../lib/selectors'
import { Link } from '../router'
import { useScan } from '../state/store'
import './overview.css'

const POSTURE_ICON: Record<'critical' | 'high' | 'ok', IconName> = { critical: 'flame', high: 'alert', ok: 'shield-check' }

export default function OverviewPage() {
  const { current } = useScan()

  if (!current) {
    return (
      <div className="ov-page">
        <PageHeader eyebrow="Overview" title="Risk overview" description="Where your dependencies stand: what is exploitable, what your code actually uses, and what to fix first." />
        <NoScan what="the risk overview" />
      </div>
    )
  }

  const r = current.result
  const { findings, plans, notes, aiStatus } = r
  const posture = computePosture(findings, current.review, r.packageCount)

  const aiNote =
    aiStatus === 'ok'
      ? {
          tone: 'ai' as const,
          body: (
            <>
              <strong>AI code check ran.</strong> It adds context only: a verdict, short reasoning and code citations. Every citation is re-checked against your source, and the AI
              can raise a tier but never lower one. It reviews at most the top 30 direct-dependency findings; the rest are shown as “Not assessed”.
            </>
          ),
        }
      : aiStatus === 'error'
        ? {
            tone: 'warn' as const,
            body: (
              <>
                <strong>The AI code check failed.</strong> Tiers here come from OSV severity, EPSS, CISA KEV and scope only. Findings show “Not assessed”, which is not the same as safe.
              </>
            ),
          }
        : {
            tone: 'info' as const,
            body: (
              <>
                <strong>The AI code check did not run</strong> (no source folder was provided, or no Gemini API key is configured). Tiers come from OSV severity, EPSS, CISA KEV and
                scope only. Findings show “Not assessed”, which is not the same as safe.{' '}
                <Link to="/scan" className="link">
                  Scan again with a source folder
                </Link>
                .
              </>
            ),
          }

  return (
    <div className="ov-page">
      <PageHeader
        eyebrow="Overview"
        title={current.projectName}
        description={
          <span className="ov-meta">
            <SourceBadge source={current.source} />
            <span>Scanned {formatScanTime(r.scannedAt)}</span>
            <span className="num">{r.packageCount.toLocaleString()} packages inspected</span>
          </span>
        }
        actions={
          <>
            <Link to="/findings" className="btn btn--primary">
              <Icon name="list" size={14} />
              View all findings
            </Link>
            <Link to="/remediation" className="btn">
              <Icon name="wrench" size={14} />
              Open fix plan
            </Link>
            <Link to="/reports" className="btn">
              <Icon name="report" size={14} />
              Export report
            </Link>
          </>
        }
      />

      {current.source === 'demo' && (
        <div className="ov-demo">
          <Callout tone="demo">
            <strong>Demo data.</strong> These findings are illustrative example data, not a real scan, and are not saved to your history.{' '}
            <Link to="/scan" className="link">
              Scan a project
            </Link>{' '}
            to see real results.
          </Callout>
        </div>
      )}

      <section className={`ov-posture ov-posture--${posture.tone}`} aria-labelledby="ov-posture-h">
        <span className="ov-posture__icon" aria-hidden="true">
          <Icon name={POSTURE_ICON[posture.tone]} size={20} />
        </span>
        <div>
          <h2 id="ov-posture-h">{posture.headline}</h2>
          <p>{posture.detail}</p>
        </div>
      </section>

      <Funnel findings={findings} review={current.review} aiStatus={aiStatus} />

      <div className="ov-cols">
        <UrgentList findings={findings} review={current.review} />
        <div className="ov-side">
          <ActionTiers findings={findings} review={current.review} />
          {findings.length > 0 && <Breakdowns findings={findings} aiStatus={aiStatus} />}
        </div>
      </div>

      <FixPlanGlance plans={plans} />

      <section className="ov-notes" aria-label="Scan notes">
        {notes.length > 0 && (
          <Callout tone="warn">
            <strong>Notes from this scan</strong>
            <ul className="ov-notes__list">
              {notes.map((n, i) => (
                <li key={`${i}-${n}`}>{n}</li>
              ))}
            </ul>
          </Callout>
        )}
        <Callout tone={aiNote.tone}>{aiNote.body}</Callout>
      </section>
    </div>
  )
}
