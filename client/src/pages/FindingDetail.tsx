import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CodeRelevance } from '../components/evidence/CodeEvidence'
import { hostAndPath } from '../components/evidence/evidence-lib'
import { DepBadge, EpssMeter, JumpBadge, KevBadge, ScopeBadge, SeverityBadge, TierBadge, VerifiedTag } from '../components/ui/Badges'
import { Icon } from '../components/ui/Icon'
import { Callout, CommandBlock, EmptyState, NoScan, PageHeader } from '../components/ui/Kit'
import { depPath, safeHttpUrl } from '../lib/format'
import { canLower, effectiveTier, findingKey, isLowered, type AiDecision, type Review } from '../lib/review'
import { EPSS_THRESHOLD, byPriority, explainTier, findByKey, findingHref, findingsForPlan, isEpssHigh, planFor } from '../lib/selectors'
import { TIER_LABEL, nextTierDown } from '../lib/tiers'
import { Link, navigate, useLocation } from '../router'
import { useScan, type ScanRecord } from '../state/store'
import type { Finding, ScanResult } from '../types'
import './finding-detail.css'

export default function FindingDetailPage() {
  const { current } = useScan()
  const { search } = useLocation()
  const key = search.get('key')

  if (!current) {
    return (
      <>
        <PageHeader title="Finding" description="Why a finding has its priority, what the advisory says, and where your code touches it." />
        <NoScan what="finding details" />
      </>
    )
  }

  const finding = key ? findByKey(current.result, key) : undefined
  if (!finding) {
    return (
      <div className="panel">
        <EmptyState
          icon="search"
          title="Finding not found"
          actions={
            <Link to="/findings" className="btn btn--primary">
              <Icon name="arrow-left" size={14} />
              Back to findings
            </Link>
          }
        >
          {key
            ? 'No finding in the open scan matches this link. It may belong to a different scan.'
            : 'This page needs a finding. Pick one from the findings list.'}
        </EmptyState>
      </div>
    )
  }

  return <FindingView record={current} finding={finding} />
}

function Provenance({ demo, children }: { demo: boolean; children: string }) {
  if (demo)
    return (
      <span className="badge" title="Demo data is illustrative, not from a real lookup">
        Illustrative · demo data
      </span>
    )
  return <VerifiedTag>{children}</VerifiedTag>
}

function FindingView({ record, finding: f }: { record: ScanRecord; finding: Finding }) {
  const key = findingKey(f)
  const review = record.review[key]
  const tier = effectiveTier(f, review)
  const lowered = isLowered(f, review)
  const demo = record.source === 'demo'
  const result = record.result

  // Prev / next follow the default priority order, the same one the explorer opens with.
  const ordered = useMemo(() => [...result.findings].sort(byPriority(record.review)), [result.findings, record.review])
  const idx = ordered.indexOf(f)
  const prev = idx > 0 ? ordered[idx - 1] : undefined
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'j' && next) navigate(findingHref(next))
      else if (e.key === 'k' && prev) navigate(findingHref(prev))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Moving between findings keeps this component mounted: put focus on the new title so it is announced.
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
  }, [key])

  return (
    <div className="fd page-enter">
      <nav className="fd-crumbs" aria-label="Breadcrumb">
        <Link to="/findings">Findings</Link>
        <Icon name="chevron-right" size={12} />
        <span className="mono" aria-current="page">
          {f.pkg.name}@{f.pkg.version}
        </span>
      </nav>

      <header className="fd-head">
        <div className="fd-head__main">
          <span className="eyebrow">Finding</span>
          <h1 ref={heading} tabIndex={-1} className="fd-title">
            {f.pkg.name}
            <span className="fd-ver">@{f.pkg.version}</span>
          </h1>
          <p className="fd-ids mono">
            <span>{f.advisory.id}</span>
            {f.advisory.aliases.map((a) => (
              <span key={a} className="subtle">
                {a}
              </span>
            ))}
          </p>
          <div className="cluster">
            <TierBadge tier={tier} />
            {lowered && <span className="badge badge--info">Lowered by reviewer (was {TIER_LABEL[f.tier]})</span>}
            <SeverityBadge severity={f.advisory.severity} />
            {f.enrichment.kev === true && <KevBadge />}
            <ScopeBadge dev={f.pkg.dev} />
            <DepBadge direct={f.pkg.direct} />
          </div>
        </div>

        <div className="fd-actions">
          <nav className="fd-pager" aria-label="Move between findings">
            {idx >= 0 && (
              <span className="fd-pager__pos num" aria-live="polite">
                {idx + 1} of {ordered.length}
              </span>
            )}
            {prev ? (
              <Link to={findingHref(prev)} className="btn btn--sm" aria-keyshortcuts="k" title="Previous finding (k)">
                <Icon name="chevron-left" size={14} />
                Previous
              </Link>
            ) : (
              <button type="button" className="btn btn--sm" disabled>
                <Icon name="chevron-left" size={14} />
                Previous
              </button>
            )}
            {next ? (
              <Link to={findingHref(next)} className="btn btn--sm" aria-keyshortcuts="j" title="Next finding (j)">
                Next
                <Icon name="chevron-right" size={14} />
              </Link>
            ) : (
              <button type="button" className="btn btn--sm" disabled>
                Next
                <Icon name="chevron-right" size={14} />
              </button>
            )}
          </nav>
          <Link to="/findings" className="btn btn--ghost btn--sm">
            <Icon name="arrow-left" size={14} />
            Back to findings
          </Link>
        </div>
      </header>

      {demo && (
        <Callout tone="demo">
          <strong>Demo data.</strong> This finding is illustrative, not from a real scan. EPSS, KEV, fix targets and code
          citations here are examples and were not looked up or checked against real code.
        </Callout>
      )}

      <div className="fd-grid">
        <div className="fd-main">
          <WhySection f={f} lowered={lowered} tier={tier} />
          <AdvisorySection key={key} f={f} />

          <section className="fd-sec" aria-labelledby="fd-code">
            <h2 id="fd-code">Code relevance</h2>
            <CodeRelevance finding={f} aiStatus={result.aiStatus} demo={demo} decision={review?.ai} />
          </section>

          <ReviewSection f={f} review={review} tier={tier} demo={demo} />
          <ReferencesSection f={f} />
        </div>

        <aside className="fd-side" aria-label="Exploitation data, dependency chain and fix">
          <div className="fd-rail">
            <ExploitationBox f={f} demo={demo} />
            <ChainBox f={f} tier={tier} />
            <RemediationBox result={result} f={f} demo={demo} />
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ main column */

function WhySection({ f, lowered, tier }: { f: Finding; lowered: boolean; tier: Finding['tier'] }) {
  const { rule, conditions } = explainTier(f)
  return (
    <section className="fd-sec" aria-labelledby="fd-why">
      <h2 id="fd-why">Why this priority</h2>
      <p className="fd-lead">{rule}</p>

      <ul className="fd-checks" aria-label="Conditions the rules look at">
        {conditions.map((c) => (
          <li key={c.label} className={c.met ? 'is-met' : undefined}>
            <span className="fd-check__mark" aria-hidden="true">
              <Icon name={c.met ? 'check' : 'minus'} size={12} />
            </span>
            <span className="fd-check__label">
              {c.label}
              {c.label.startsWith('AI ') && (
                <span className="badge badge--ai" title="This signal comes from the AI code check">
                  AI
                </span>
              )}
            </span>
            <span className="fd-check__state">{c.met ? 'Met' : 'Not met'}</span>
          </li>
        ))}
      </ul>

      {f.reasons.length > 0 && (
        <div className="fd-reasons">
          <h3 className="fd-sub">Signals reported by the scan</h3>
          <ul className="fd-chips">
            {f.reasons.map((r, i) => (
              <li key={i} className={`fd-chip${/^(AI:|Your code calls)/.test(r) ? ' fd-chip--ai' : ''}`}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowered && (
        <p className="fd-fine">
          The rule above describes the original tier ({TIER_LABEL[f.tier]}). A reviewer lowered this finding one step to{' '}
          {TIER_LABEL[tier]}.
        </p>
      )}
      <p className="fd-fine">
        Tiers come from fixed, published rules. The AI can only raise a tier; only a person can lower one.{' '}
        <Link to="/#how-it-works" className="link">
          How tiers work
        </Link>
      </p>
    </section>
  )
}

const COLLAPSE_AT = 600

function collapsed(text: string): string {
  const cut = text.slice(0, COLLAPSE_AT)
  const space = cut.lastIndexOf(' ')
  return `${space > COLLAPSE_AT * 0.7 ? cut.slice(0, space) : cut} …`
}

function AdvisorySection({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false)
  const details = f.advisory.details.trim()
  const long = details.length > COLLAPSE_AT
  return (
    <section className="fd-sec" aria-labelledby="fd-adv">
      <h2 id="fd-adv">What the advisory says</h2>
      <p className="fd-lead">{f.advisory.summary || 'No summary was published for this advisory.'}</p>
      {details ? (
        <>
          <div id="fd-details" className="fd-details">
            {long && !open ? collapsed(details) : details}
          </div>
          {long && (
            <button type="button" className="btn btn--sm btn--ghost fd-more" aria-expanded={open} aria-controls="fd-details" onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? 'minus' : 'plus'} size={14} />
              {open ? 'Show less' : 'Show full advisory'}
            </button>
          )}
        </>
      ) : (
        <p className="muted">No further details were published.</p>
      )}
      <p className="fd-fine">Advisory text from OSV.dev, shown as untrusted plain text.</p>
    </section>
  )
}

function ReviewSection({ f, review, tier, demo }: { f: Finding; review: Review | undefined; tier: Finding['tier']; demo: boolean }) {
  const { setReview } = useScan()
  const key = findingKey(f)
  const lowered = isLowered(f, review)
  const lowerable = canLower(f, review)
  const isKev = f.enrichment.kev === true
  const down = nextTierDown(f.tier)

  function setAi(decision: AiDecision) {
    setReview(key, { ...review, ai: review?.ai === decision ? undefined : decision })
  }

  const hint = isKev
    ? 'KEV findings can never be lowered: this vulnerability is known to be exploited.'
    : lowered
      ? `Lowered from ${TIER_LABEL[f.tier]} to ${TIER_LABEL[tier]} by a reviewer. Restoring puts it back.`
      : !lowerable
        ? `Already in the lowest tier (${TIER_LABEL[f.tier]}), so it cannot be lowered further.`
        : `Lowering moves this finding down one tier, from ${TIER_LABEL[f.tier]} to ${TIER_LABEL[down ?? f.tier]}. Only a person can do this; the AI can only raise priority.`

  return (
    <section className="fd-sec" aria-labelledby="fd-review">
      <h2 id="fd-review">Human review</h2>
      <p className="muted fd-lead-sm">
        Your decisions are saved with this scan in this browser and included in JSON and Markdown exports.
        {demo && ' Demo data is not saved, so decisions on it last only until you reload.'}
      </p>

      <div className="fd-review">
        {f.ai && (
          <div className="fd-review__group">
            <h3 className="fd-sub">AI verdict</h3>
            <div className="cluster">
              <button type="button" className="btn" aria-pressed={review?.ai === 'confirmed'} onClick={() => setAi('confirmed')}>
                <Icon name="thumb-up" size={14} />
                Confirm AI verdict
              </button>
              <button type="button" className="btn" aria-pressed={review?.ai === 'disputed'} onClick={() => setAi('disputed')}>
                <Icon name="thumb-down" size={14} />
                Dispute AI verdict
              </button>
            </div>
            <p className="fd-fine">
              Confirming or disputing records your judgement in exports. It does not change the tier; use the priority control for that.
            </p>
          </div>
        )}

        <div className="fd-review__group">
          <h3 className="fd-sub">Priority</h3>
          <div className="cluster">
            {lowered ? (
              <button type="button" className="btn" onClick={() => setReview(key, { ...review, lowered: false })}>
                <Icon name="refresh" size={14} />
                Restore original priority
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={!lowerable}
                aria-describedby="fd-lower-hint"
                onClick={() => setReview(key, { ...review, lowered: true })}
              >
                <Icon name="arrow-down" size={14} />
                Lower priority one tier
              </button>
            )}
          </div>
          <p id="fd-lower-hint" className="fd-fine" role="status">
            {hint}
          </p>
        </div>
      </div>
    </section>
  )
}

function ReferencesSection({ f }: { f: Finding }) {
  const refs = f.advisory.references.map((raw) => ({ raw, url: safeHttpUrl(raw) }))
  return (
    <section className="fd-sec" aria-labelledby="fd-refs">
      <h2 id="fd-refs">References</h2>
      {refs.length === 0 ? (
        <p className="muted">None published.</p>
      ) : (
        <ul className="fd-refs">
          {refs.map(({ raw, url }, i) => {
            if (!url)
              return (
                <li key={i}>
                  <span className="mono subtle fd-ref__plain" title="Not an http(s) link, so it is not clickable">
                    {raw}
                  </span>
                </li>
              )
            const { host, rest } = hostAndPath(url)
            return (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" title={url} className="fd-ref">
                  <span className="fd-ref__host">{host}</span>
                  {rest && <span className="fd-ref__rest">{rest}</span>}
                  <Icon name="external" size={12} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      <p className="fd-fine">Links come from the advisory and are untrusted; only http(s) links are clickable.</p>
    </section>
  )
}

/* ------------------------------------------------------------------ side column */

function Box({ id, title, tag, verified, children }: { id: string; title: string; tag?: ReactNode; verified?: boolean; children: ReactNode }) {
  return (
    <section className={`fd-box${verified ? ' fd-box--verified' : ''}`} aria-labelledby={id}>
      <div className="fd-box__head">
        <h2 id={id} className="eyebrow">
          {title}
        </h2>
        {tag}
      </div>
      {children}
    </section>
  )
}

function ExploitationBox({ f, demo }: { f: Finding; demo: boolean }) {
  const { epss, kev } = f.enrichment
  return (
    <Box id="fd-exploit" title="Exploitation data" verified={!demo} tag={<Provenance demo={demo}>External data</Provenance>}>
      <dl className="fd-kv">
        <div>
          <dt>EPSS</dt>
          <dd>
            {epss === null ? (
              <span className="muted">No data: unknown, not zero.</span>
            ) : (
              <EpssMeter epss={epss} />
            )}
            <p className="fd-fine">
              Estimated probability of exploitation in the next 30 days (FIRST.org).
              {epss !== null &&
                (isEpssHigh(epss)
                  ? ` At or above the ${EPSS_THRESHOLD * 100}% line used for ranking.`
                  : ` Below the ${EPSS_THRESHOLD * 100}% line used for ranking.`)}
            </p>
          </dd>
        </div>
        <div>
          <dt>CISA KEV</dt>
          <dd>
            {kev === true ? (
              <span className="cluster">
                <KevBadge />
                <span>Yes, exploited in the wild</span>
              </span>
            ) : kev === false ? (
              <span>Not listed</span>
            ) : (
              <span className="muted">Not checked (no CVE id)</span>
            )}
            <p className="fd-fine">CISA Known Exploited Vulnerabilities catalogue.</p>
          </dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>
            <SeverityBadge severity={f.advisory.severity} />
            <p className="fd-fine">As published in the advisory (OSV.dev).</p>
          </dd>
        </div>
      </dl>
    </Box>
  )
}

function ChainBox({ f, tier }: { f: Finding; tier: Finding['tier'] }) {
  const path = depPath(f.pkg.path, f.pkg.name)
  const parent = path.length >= 2 ? path[path.length - 2] : null
  return (
    <Box id="fd-chain" title="Dependency chain">
      <ol className="fd-chain" aria-label={`Your project, then ${path.join(', then ')}`}>
        <li className="fd-chain__root">Your project</li>
        {path.map((p, i) =>
          i === path.length - 1 ? (
            <li key={`${p}-${i}`} className="is-target" data-tier={tier} aria-current="true">
              <span className="mono">
                {p}@{f.pkg.version}
              </span>
              <span className="fd-chain__tag">Vulnerable</span>
            </li>
          ) : (
            <li key={`${p}-${i}`}>
              <span className="mono">{p}</span>
            </li>
          ),
        )}
      </ol>
      <p className="fd-fine">
        {f.pkg.direct
          ? 'Direct dependency: listed in your package.json.'
          : parent
            ? `Transitive dependency: pulled in by ${parent}.`
            : 'Transitive dependency.'}
      </p>
    </Box>
  )
}

function RemediationBox({ result, f, demo }: { result: ScanResult; f: Finding; demo: boolean }) {
  const plan = planFor(result, f)
  const fixed = f.advisory.fixedVersions
  const covered = plan ? findingsForPlan(result, plan).length : 0
  const isOverride = !!plan?.command && (plan.command.startsWith('npm pkg set') || plan.command.startsWith('Add to package.json'))
  return (
    <Box id="fd-fix" title="Remediation" tag={plan?.to ? <Provenance demo={demo}>Re-checked against OSV</Provenance> : undefined}>
      {!plan ? (
        <p className="muted">No upgrade plan was returned for this package.</p>
      ) : plan.to === null ? (
        <Callout tone="warn">
          <strong>No verified fix available</strong> for {plan.name}@{plan.from}. Vulnera only recommends versions that were
          re-checked against OSV.dev; consider replacing or removing this package.
        </Callout>
      ) : (
        <div className="stack">
          <div className="fd-fix">
            <span className="mono">{plan.from}</span>
            <Icon name="arrow-right" size={14} />
            <span className="mono fd-fix__to">{plan.to}</span>
            <JumpBadge jump={plan.jump} />
          </div>
          {covered > 1 && <p className="fd-fine">This version clears all {covered} advisories found for {plan.name}@{plan.from}.</p>}
          {plan.viaParent &&
            (isOverride ? (
              <p className="fd-fine">
                Transitive, pulled in via <strong className="mono">{plan.viaParent}</strong>. The command pins the fixed
                version with an override: a suggestion that needs testing. Upgrading {plan.viaParent} may also resolve it.
              </p>
            ) : (
              <p className="fd-fine">
                Transitive: upgrade via <strong className="mono">{plan.viaParent}</strong>.
              </p>
            ))}
          {plan.command && <CommandBlock command={plan.command} prompt={!plan.command.startsWith('Add to package.json')} />}
          {plan.jump === 'major' && <p className="fd-fine">Major version change: check the changelog for breaking changes.</p>}
        </div>
      )}

      <dl className="fd-kv fd-kv--tight">
        <div>
          <dt>Affected (installed)</dt>
          <dd className="mono">{f.pkg.version}</dd>
        </div>
        <div>
          <dt>Fixed in (first fixed per affected range)</dt>
          <dd>
            {fixed.length > 0 ? (
              <ul className="fd-vers">
                {fixed.map((v) => (
                  <li key={v} className="mono">
                    {v}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="muted">None published</span>
            )}
          </dd>
        </div>
      </dl>

      <Link to="/remediation" className="btn btn--sm">
        Open full fix plan
        <Icon name="arrow-right" size={14} />
      </Link>
    </Box>
  )
}
