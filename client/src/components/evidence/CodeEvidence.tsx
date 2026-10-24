import { useMemo } from 'react'
import type { AiDecision } from '../../lib/review'
import { useScan } from '../../state/store'
import type { Finding, ScanResult } from '../../types'
import { AiTag, VERDICT_LONG, VerdictBadge, VerifiedTag } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import {
  contextFor,
  matchingSentences,
  normPath,
  notAssessedReason,
  splitByTerms,
  usableApis,
  type Citation,
  type CitationContext,
} from './evidence-lib'
import './code-evidence.css'

// Provenance rules used by everything in this file:
//  - violet + dashed  = produced by the AI (verdict, reasoning, extracted API names)
//  - solid green      = checked by the server (citation quotes) or taken verbatim from a source (advisory text, your files)

const VERIFY_HINT =
  'The server checked that this quote exists at this file and line (within one line) in the files you uploaded. Citations that fail the check are dropped before they reach this page.'

type ContextState = 'ok' | 'no-sources' | 'no-file' | 'no-match'
interface Resolved {
  citation: Citation
  ctx: CitationContext | null
  state: ContextState
}

function resolveContext(c: Citation, files: Map<string, string> | null): Resolved {
  if (!files) return { citation: c, ctx: null, state: 'no-sources' }
  const content = files.get(normPath(c.file))
  if (content === undefined) return { citation: c, ctx: null, state: 'no-file' }
  const ctx = contextFor(content, c)
  return ctx ? { citation: c, ctx, state: 'ok' } : { citation: c, ctx: null, state: 'no-match' }
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {splitByTerms(text, terms).map((p, i) =>
        p.hit ? (
          <code key={i} className="ce-hl">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

export function ApiChips({ apis }: { apis: string[] }) {
  return (
    <ul className="ce-apis" aria-label="Vulnerable APIs named in the advisory">
      {apis.map((a) => (
        <li key={a} className="ce-api" title="Extracted from the advisory text by the AI">
          {a}
        </li>
      ))}
    </ul>
  )
}

/** Loud, honest empty state for findings the AI never looked at. Never says "safe". */
export function NotAssessed({ finding, aiStatus }: { finding: Finding; aiStatus: ScanResult['aiStatus'] }) {
  return (
    <div className="ce-na">
      <div className="ce-verdict">
        <VerdictBadge verdict="NOT_ASSESSED" />
        <span className="ce-verdict__long">No AI assessment for this finding</span>
      </div>
      <p>{notAssessedReason(finding, aiStatus)}</p>
      <p className="ce-fine">
        Not assessed does not mean safe. It only means the code check did not look at this finding, so the priority above
        comes from severity, EPSS, KEV and scope alone.
      </p>
    </div>
  )
}

function VerifiedOrDemo({ demo }: { demo: boolean }) {
  if (demo)
    return (
      <span className="badge" title="Demo data: this citation was not checked against real code">
        Illustrative · demo data
      </span>
    )
  return (
    <span title={VERIFY_HINT}>
      <VerifiedTag>Quote verified in source</VerifiedTag>
    </span>
  )
}

/** Two-pane evidence: what the advisory says is vulnerable, next to the line of your code that reaches it. */
function CitationEvidence({ finding: f, resolved, demo }: { finding: Finding; resolved: Resolved; demo: boolean }) {
  const { citation: c, ctx } = resolved
  const apis = usableApis(f.ai?.vulnerableApis)
  const sentences = matchingSentences(f.advisory.details, apis)
  const lines = ctx?.lines ?? [{ no: c.line, text: c.quote, hit: true }]
  const shownLine = ctx?.foundAt ?? c.line

  return (
    <figure className="ce-pair">
      <div className="ce-pane">
        <div className="ce-pane__head">
          <span className="ce-pane__title">Advisory: vulnerable function</span>
          <span className="badge" title="Advisory text is untrusted input from OSV.dev, shown as plain text">
            OSV.dev text
          </span>
        </div>
        <div className="ce-pane__body">
          {apis.length > 0 && <ApiChips apis={apis} />}
          {sentences.length > 0 ? (
            sentences.map((s, i) => (
              <p key={i} className="ce-sentence">
                <Highlighted text={s} terms={apis} />
              </p>
            ))
          ) : (
            <>
              <p className="ce-fine">
                {apis.length > 0
                  ? 'No sentence in the advisory text mentions these names. Advisory summary:'
                  : 'No vulnerable function was extracted for this advisory. Advisory summary:'}
              </p>
              <p className="ce-sentence">{f.advisory.summary || 'No summary was published.'}</p>
            </>
          )}
        </div>
      </div>

      <div className="ce-pane ce-pane--code">
        <div className="ce-pane__head">
          <span className="ce-pane__title">Your code</span>
          <VerifiedOrDemo demo={demo} />
        </div>
        <p className="ce-loc mono" title={c.file}>
          {c.file}:{shownLine}
          {shownLine !== c.line && <span className="subtle"> (cited as line {c.line})</span>}
        </p>
        <div className="ce-code" tabIndex={0} role="region" aria-label={`Source excerpt from ${c.file}, line ${shownLine}`}>
          <div className="ce-lines">
            {lines.map((l) => (
              <div key={l.no} className={`ce-line${l.hit ? ' ce-line--hit' : ''}`}>
                <span className="ce-ln" aria-hidden="true">
                  {l.no}
                </span>
                <span className="ce-lt">
                  {l.hit && <span className="sr-only">{`Cited line ${l.no}: `}</span>}
                  {l.text || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

const STATE_NOTE: Record<Exclude<ContextState, 'ok'>, string> = {
  'no-sources': 'Context lines are shown only for scans uploaded in this session.',
  'no-file': 'This file is not among the uploaded sources held in memory, so only the quote is shown.',
  'no-match': 'The cited quote could not be matched in the uploaded copy of the file, so only the quote is shown.',
}

interface CodeRelevanceProps {
  finding: Finding
  aiStatus: ScanResult['aiStatus']
  /** Demo data: citations are illustrative, so the "verified" claim is not made. */
  demo?: boolean
  /** The reviewer's decision on the AI verdict, if any. */
  decision?: AiDecision
}

/** The full "Code relevance" block for one finding. */
export function CodeRelevance({ finding: f, aiStatus, demo = false, decision }: CodeRelevanceProps) {
  const { sources, current } = useScan()
  const ai = f.ai
  const files = useMemo(() => (sources ? new Map(sources.map((s) => [normPath(s.path), s.content])) : null), [sources])
  const resolved = useMemo(() => (ai?.citations ?? []).map((c) => resolveContext(c, files)), [ai, files])

  if (!ai) return <NotAssessed finding={f} aiStatus={aiStatus} />

  const apis = usableApis(ai.vulnerableApis)
  const isSample = current?.sourceFileCount === -1
  const notes = [...new Set(resolved.filter((r) => r.state !== 'ok').map((r) => r.state))] as Exclude<ContextState, 'ok'>[]

  return (
    <div className="ce">
      <div className="ce-verdict">
        <VerdictBadge verdict={ai.verdict} />
        <span className="ce-verdict__long">{VERDICT_LONG[ai.verdict]}</span>
        <AiTag />
        {decision && (
          <span className={`badge ${decision === 'confirmed' ? 'badge--ok' : 'badge--warn'}`}>
            Reviewer {decision} this verdict
          </span>
        )}
      </div>

      <div className="callout callout--ai ce-ai">
        <Icon name="sparkle" />
        <div>
          <p className="ce-ai__label">AI assessment · needs human confirmation</p>
          <p className="ce-ai__text">{ai.reasoning}</p>
        </div>
      </div>

      {ai.verdict === 'UNCERTAIN' && (
        <p className="ce-note">The model could not decide from the code provided; treat as possibly affected.</p>
      )}
      {ai.verdict === 'NO_VULNERABLE_USAGE_FOUND' && (
        <p className="ce-note">
          No vulnerable usage found in the files provided. This does not lower the priority; only a reviewer can.
        </p>
      )}
      {ai.verdict === 'USES_VULNERABLE_API' && (
        <p className="ce-note">
          Your code reaches the function the advisory describes. For high or critical findings in production code, this is
          one of the signals that sets the tier to Fix now.
        </p>
      )}

      <div>
        <h3 className="ce-sub">Vulnerable API named in the advisory</h3>
        {apis.length > 0 ? (
          <ApiChips apis={apis} />
        ) : (
          <p className="ce-fine">Not stated. The AI did not extract a function or option name for this advisory.</p>
        )}
      </div>

      <div>
        <h3 className="ce-sub">
          Citations <span className="count num">{resolved.length}</span>
        </h3>
        {resolved.length === 0 ? (
          <p className="ce-fine">
            {ai.verdict === 'UNCERTAIN'
              ? 'No citation survived the server-side check, so no line of your code is shown.'
              : 'The AI did not cite any line of your code for this verdict.'}
          </p>
        ) : (
          <div className="ce-list">
            {resolved.map((r, i) => (
              <CitationEvidence key={`${r.citation.file}:${r.citation.line}:${i}`} finding={f} resolved={r} demo={demo} />
            ))}
            {demo && (
              <p className="ce-fine">Demo data: these citations are examples and were not checked against any real source.</p>
            )}
            {notes.map((n) => (
              <p key={n} className="ce-fine">
                {n === 'no-sources' && isSample
                  ? 'The sample project is read on the server, so only the verified quote is shown here. Context lines are shown only for scans uploaded in this session.'
                  : STATE_NOTE[n]}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Compact `file:line` + quote, used where several findings are listed together. */
export function CitationQuote({ citation: c, demo = false }: { citation: Citation; demo?: boolean }) {
  return (
    <div className="ce-cite">
      <div className="ce-cite__head">
        <span className="ce-loc mono" title={c.file}>
          {c.file}:{c.line}
        </span>
        {demo ? (
          <span className="badge" title="Demo data: this citation was not checked against real code">
            Illustrative
          </span>
        ) : (
          <span title={VERIFY_HINT}>
            <VerifiedTag>Quote verified</VerifiedTag>
          </span>
        )}
      </div>
      <pre className="code ce-cite__quote">
        <code>{c.quote}</code>
      </pre>
    </div>
  )
}
