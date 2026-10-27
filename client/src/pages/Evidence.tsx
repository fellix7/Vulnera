import { useMemo } from 'react'
import { ApiChips, CitationQuote } from '../components/evidence/CodeEvidence'
import { usableApis } from '../components/evidence/evidence-lib'
import { TierBadge, VerdictBadge } from '../components/ui/Badges'
import { Icon } from '../components/ui/Icon'
import { Callout, EmptyState, NoScan, PageHeader } from '../components/ui/Kit'
import { effectiveTier, findingKey } from '../lib/review'
import { aiCounts, byPriority, findingHref } from '../lib/selectors'
import { Link, setSearch, useLocation } from '../router'
import { useScan, type ScanRecord } from '../state/store'
import type { AiVerdict, Finding } from '../types'
import './evidence.css'

type Verdict = AiVerdict['verdict']
type Bucket = 'uses' | 'uncertain' | 'none'
type Filter = 'all' | Bucket

const BUCKET_OF: Record<Verdict, Bucket> = {
  USES_VULNERABLE_API: 'uses',
  UNCERTAIN: 'uncertain',
  NO_VULNERABLE_USAGE_FOUND: 'none',
}

const GROUPS: { bucket: Bucket; verdict: Verdict; title: string; blurb: string }[] = [
  {
    bucket: 'uses',
    verdict: 'USES_VULNERABLE_API',
    title: 'Uses vulnerable code',
    blurb: 'Your code calls the function the advisory describes, and a cited line was checked against your source. For high or critical findings in production code this sets the tier to Fix now.',
  },
  {
    bucket: 'uncertain',
    verdict: 'UNCERTAIN',
    title: 'Uncertain',
    blurb: 'The model could not decide from the code provided. Treat these as possibly affected.',
  },
  {
    bucket: 'none',
    verdict: 'NO_VULNERABLE_USAGE_FOUND',
    title: 'No usage found',
    blurb: 'No vulnerable usage was found in the files provided. This does not lower the priority; only a reviewer can.',
  },
]

const parseFilter = (v: string | null): Filter => (v === 'uses' || v === 'uncertain' || v === 'none' ? v : 'all')

export default function EvidencePage() {
  const { current } = useScan()
  const { search } = useLocation()

  if (!current) {
    return (
      <>
        <Header />
        <NoScan what="code evidence" />
      </>
    )
  }
  return <EvidenceView record={current} search={search} />
}

function Header() {
  return (
    <PageHeader
      title="Code evidence"
      description="Where AI found your code reaching a vulnerable function, with every citation checked against your source."
    />
  )
}

function EvidenceView({ record, search }: { record: ScanRecord; search: URLSearchParams }) {
  const { findings, aiStatus } = record.result
  const demo = record.source === 'demo'
  const filter = parseFilter(search.get('verdict'))

  const counts = aiCounts(findings)
  const total = findings.length
  const assessed = total - counts.NOT_ASSESSED

  const buckets = useMemo(() => {
    const out: Record<Bucket, Finding[]> = { uses: [], uncertain: [], none: [] }
    for (const f of [...findings].sort(byPriority(record.review))) if (f.ai) out[BUCKET_OF[f.ai.verdict]].push(f)
    return out
  }, [findings, record.review])

  function choose(next: Filter) {
    const p = new URLSearchParams(search)
    if (next === 'all') p.delete('verdict')
    else p.set('verdict', next)
    setSearch(p)
  }

  const options: { value: Filter; label: string; n: number }[] = [
    { value: 'all', label: 'All assessed', n: assessed },
    { value: 'uses', label: 'Uses vulnerable code', n: counts.USES_VULNERABLE_API },
    { value: 'uncertain', label: 'Uncertain', n: counts.UNCERTAIN },
    { value: 'none', label: 'No usage found', n: counts.NO_VULNERABLE_USAGE_FOUND },
  ]
  const segments = [
    { cls: 'ev-s-uses', n: counts.USES_VULNERABLE_API },
    { cls: 'ev-s-uncertain', n: counts.UNCERTAIN },
    { cls: 'ev-s-none', n: counts.NO_VULNERABLE_USAGE_FOUND },
    { cls: 'ev-s-na', n: counts.NOT_ASSESSED },
  ].filter((sg) => sg.n > 0)
  const visible = GROUPS.filter((g) => filter === 'all' || g.bucket === filter)

  return (
    <div className="ev page-enter">
      <Header />

      {demo && (
        <Callout tone="demo">
          <strong>Demo data.</strong> These findings, AI assessments and citations are illustrative, not from a real scan. The
          citations were not checked against any real source.
        </Callout>
      )}

      <section className="ev-cov" aria-labelledby="ev-cov-h">
        <h2 id="ev-cov-h" className="sr-only">
          Coverage
        </h2>
        <div className="ev-cov__stat">
          <span className="ev-cov__num num">
            {assessed}
            <small> / {total}</small>
          </span>
          <span className="ev-cov__label">findings assessed by the AI code check</span>
        </div>
        <div className="ev-cov__viz">
          {total > 0 && (
            <>
              <div
                className="ev-bar"
                role="img"
                aria-label={`Of ${total} findings: ${counts.USES_VULNERABLE_API} use vulnerable code, ${counts.UNCERTAIN} uncertain, ${counts.NO_VULNERABLE_USAGE_FOUND} with no usage found, ${counts.NOT_ASSESSED} not assessed`}
              >
                {segments.map((sg) => (
                  <span key={sg.cls} className={sg.cls} style={{ flexGrow: sg.n }} />
                ))}
              </div>
              <ul className="ev-legend">
                <li>
                  <i className="ev-sw ev-s-uses" aria-hidden="true" />
                  Uses vulnerable code <span className="num">{counts.USES_VULNERABLE_API}</span>
                </li>
                <li>
                  <i className="ev-sw ev-s-uncertain" aria-hidden="true" />
                  Uncertain <span className="num">{counts.UNCERTAIN}</span>
                </li>
                <li>
                  <i className="ev-sw ev-s-none" aria-hidden="true" />
                  No usage found <span className="num">{counts.NO_VULNERABLE_USAGE_FOUND}</span>
                </li>
                <li>
                  <i className="ev-sw ev-s-na" aria-hidden="true" />
                  Not assessed <span className="num">{counts.NOT_ASSESSED}</span>
                </li>
              </ul>
            </>
          )}
        </div>
      </section>

      {!demo && <StatusNote record={record} />}

      {counts.NOT_ASSESSED > 0 && assessed > 0 && (
        <p className="ev-na">
          <strong className="num">{counts.NOT_ASSESSED}</strong> findings were not assessed. That does not mean they are safe;
          the AI code check only looks at direct dependencies, up to 30 findings.{' '}
          <Link to="/findings?ai=unassessed" className="link">
            View not assessed findings
          </Link>
        </p>
      )}

      {total === 0 ? (
        <div className="panel">
          <EmptyState icon="shield-check" title="No vulnerabilities matched in this scan">
            There is nothing for the AI code check to assess.
          </EmptyState>
        </div>
      ) : assessed === 0 ? (
        <NothingAssessed aiStatus={aiStatus} sourceFileCount={record.sourceFileCount} notAssessed={counts.NOT_ASSESSED} />
      ) : (
        <>
          <div className="ev-filter">
            <div className="seg" role="group" aria-label="Filter by AI verdict">
              {options.map((o) => (
                <button key={o.value} type="button" aria-pressed={filter === o.value} onClick={() => choose(o.value)}>
                  {o.label}
                  <span className="count">{o.n}</span>
                </button>
              ))}
            </div>
          </div>

          {filter !== 'all' && buckets[filter].length === 0 ? (
            <div className="panel">
              <EmptyState icon="search" title="No findings with this verdict" actions={<button type="button" className="btn" onClick={() => choose('all')}>Show all assessed</button>}>
                {filter === 'uses'
                  ? 'The AI did not find your code calling a vulnerable function in this scan. That is not a guarantee: only the files provided were checked.'
                  : filter === 'uncertain'
                    ? 'Every assessed finding got a clear answer from the model.'
                    : 'The AI did not rule out any finding on the basis of your code.'}
              </EmptyState>
            </div>
          ) : (
            visible.map((g) =>
              buckets[g.bucket].length === 0 ? null : (
                <section key={g.bucket} className="ev-group" aria-labelledby={`ev-${g.bucket}`}>
                  <div className="ev-group__head">
                    <h2 id={`ev-${g.bucket}`}>{g.title}</h2>
                    <span className="count num">{buckets[g.bucket].length}</span>
                  </div>
                  <p className="ev-group__blurb">{g.blurb}</p>
                  <ul className="ev-list">
                    {buckets[g.bucket].map((f) => (
                      <EvidenceRow key={findingKey(f)} f={f} record={record} demo={demo} />
                    ))}
                  </ul>
                </section>
              ),
            )
          )}
        </>
      )}
    </div>
  )
}

function StatusNote({ record }: { record: ScanRecord }) {
  const { aiStatus } = record.result
  const n = record.sourceFileCount
  if (aiStatus === 'ok') {
    return (
      <Callout tone="info">
        <strong>AI code check ran{n > 0 ? ` on ${n} source file${n === 1 ? '' : 's'}` : n === -1 ? ' on the sample project source' : ''}.</strong>{' '}
        It reviews up to 30 direct-dependency findings in priority order, and only when source files are provided. Every
        citation was checked against your files on the server before it is shown; the verdicts and reasoning are the model’s
        and need human confirmation.
      </Callout>
    )
  }
  if (aiStatus === 'disabled') {
    return (
      <Callout tone="warn">
        <strong>The AI code check did not run for this scan.</strong> To enable it, upload a source folder together with your
        lockfile and configure <code>GEMINI_API_KEY</code> on the server.
      </Callout>
    )
  }
  return (
    <Callout tone="danger" role="alert">
      <strong>The AI code check failed for this scan.</strong> Findings below carry no AI context. Run the scan again to retry.
    </Callout>
  )
}

function NothingAssessed({ aiStatus, sourceFileCount, notAssessed }: { aiStatus: ScanRecord['result']['aiStatus']; sourceFileCount: number; notAssessed: number }) {
  const rescan = (
    <>
      <Link to="/scan" className="btn btn--primary">
        <Icon name="upload" size={14} />
        {aiStatus === 'error' ? 'Run the scan again' : 'Scan with source files'}
      </Link>
      {notAssessed > 0 && (
        <Link to="/findings?ai=unassessed" className="btn">
          View {notAssessed} not assessed
        </Link>
      )}
    </>
  )
  return (
    <div className="panel">
      {aiStatus === 'disabled' ? (
        <EmptyState icon="code" title="No code evidence yet" actions={rescan}>
          {sourceFileCount === 0
            ? 'No source files were uploaded with this scan, so the AI had no code to read. '
            : 'The AI code check was unavailable. '}
          Upload your project’s source folder along with the lockfile, and make sure <code>GEMINI_API_KEY</code> is configured on the
          server. Findings are not assessed, which does not mean they are safe.
        </EmptyState>
      ) : aiStatus === 'error' ? (
        <EmptyState icon="alert" title="The AI code check failed" actions={rescan}>
          No findings were assessed in this scan. Run it again to retry. Not assessed does not mean safe.
        </EmptyState>
      ) : (
        <EmptyState icon="code" title="Nothing was assessed" actions={rescan}>
          The AI code check ran but returned no assessments. It only reviews direct-dependency findings, so a scan where every
          vulnerable package is transitive has nothing to assess. Not assessed does not mean safe.
        </EmptyState>
      )}
    </div>
  )
}

function EvidenceRow({ f, record, demo }: { f: Finding; record: ScanRecord; demo: boolean }) {
  const ai = f.ai
  if (!ai) return null
  const review = record.review[findingKey(f)]
  const tier = effectiveTier(f, review)
  const apis = usableApis(ai.vulnerableApis)
  const shown = ai.citations.slice(0, 2)
  const more = ai.citations.length - shown.length
  const name = `${f.pkg.name}@${f.pkg.version}`

  return (
    <li className="ev-row">
      <div className="ev-row__head">
        <div className="ev-row__id">
          <TierBadge tier={tier} />
          <h3 className="ev-row__pkg mono">{name}</h3>
          <span className="ev-row__adv mono">{f.advisory.id}</span>
        </div>
        <div className="cluster">
          <VerdictBadge verdict={ai.verdict} />
          {review?.ai && (
            <span className={`badge ${review.ai === 'confirmed' ? 'badge--ok' : 'badge--warn'}`}>Reviewer {review.ai}</span>
          )}
          <Link to={findingHref(f)} className="btn btn--sm" aria-label={`Open evidence for ${name}, ${f.advisory.id}`}>
            Open evidence
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>

      {f.advisory.summary && <p className="ev-row__summary">{f.advisory.summary}</p>}

      <div className="callout callout--ai ce-ai">
        <Icon name="sparkle" />
        <div>
          <p className="ce-ai__label">AI assessment</p>
          <p className="ce-ai__text">{ai.reasoning}</p>
        </div>
      </div>

      {apis.length > 0 && <ApiChips apis={apis} />}

      {shown.length > 0 ? (
        <div className="ev-cites">
          {shown.map((c, i) => (
            <CitationQuote key={`${c.file}:${c.line}:${i}`} citation={c} demo={demo} />
          ))}
        </div>
      ) : (
        <p className="ce-fine">{ai.verdict === 'UNCERTAIN' ? 'No citation survived the server-side check.' : 'No line of your code was cited.'}</p>
      )}
      {more > 0 && (
        <p className="ce-fine">
          +{more} more citation{more === 1 ? '' : 's'} on the finding page.
        </p>
      )}
    </li>
  )
}
