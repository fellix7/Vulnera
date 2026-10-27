import { useEffect, useMemo, useRef, useState } from 'react'
import { copyText, downloadText } from '../../lib/download'
import { buildJson, buildMarkdown } from '../../lib/report'
import { TIER_ORDER } from '../../lib/tiers'
import { formatScanTime, tierCounts } from '../../lib/selectors'
import type { ScanRecord } from '../../state/store'
import { SourceBadge, TierBadge } from '../ui/Badges'
import { Icon } from '../ui/Icon'
import { AiStatusTag } from './AiStatusTag'
import { exportFileName, reviewerDecisions } from './scanDiff'

const PREVIEW_LINES = 25

export function CurrentReport({ current }: { current: ScanRecord }) {
  const { result, review } = current
  const demo = current.source === 'demo'
  const markdown = useMemo(() => buildMarkdown(result, review, demo ? 'mock' : 'api'), [result, review, demo])
  const lines = useMemo(() => markdown.split('\n'), [markdown])
  const counts = useMemo(() => tierCounts(result.findings, review), [result, review])
  const decisions = useMemo(() => reviewerDecisions(result.findings, review).length, [result, review])

  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copyMarkdown() {
    const ok = await copyText(markdown)
    setCopied(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied('idle'), 2000)
  }

  const preview = lines.slice(0, PREVIEW_LINES).join('\n')

  return (
    <section className="panel rep-current" aria-labelledby="rep-current-h">
      <div className="panel__head">
        <h2 id="rep-current-h">Current report</h2>
        <SourceBadge source={current.source} />
      </div>
      <div className="panel__body rep-current__grid">
        <div className="rep-current__main">
          <dl className="rep-meta">
            <div>
              <dt>Project</dt>
              <dd className="truncate" title={current.projectName}>
                {current.projectName}
              </dd>
            </div>
            <div>
              <dt>Scanned</dt>
              <dd className="num" title={result.scannedAt}>
                {formatScanTime(result.scannedAt)}
              </dd>
            </div>
            <div>
              <dt>Packages</dt>
              <dd className="num">{result.packageCount}</dd>
            </div>
            <div>
              <dt>Findings</dt>
              <dd className="num">{result.findings.length}</dd>
            </div>
            <div>
              <dt>AI code check</dt>
              <dd>
                <AiStatusTag result={result} />
              </dd>
            </div>
            <div>
              <dt>Reviewer decisions</dt>
              <dd className="num">{decisions}</dd>
            </div>
          </dl>

          <div>
            <h3 className="rep-sub">Findings by tier</h3>
            <ul className="rep-tiers">
              {TIER_ORDER.map((tier) => (
                <li key={tier}>
                  <TierBadge tier={tier} />
                  <span className="mono num">{counts[tier]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="cluster">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadText(exportFileName(current, 'md'), markdown, 'text/markdown')}
            >
              <Icon name="download" size={14} />
              Download Markdown report
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => downloadText(exportFileName(current, 'json'), buildJson(result, review), 'application/json')}
            >
              <Icon name="download" size={14} />
              Download JSON
            </button>
            <button type="button" className="btn" onClick={copyMarkdown}>
              <Icon name={copied === 'copied' ? 'check' : 'copy'} size={14} />
              {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy Markdown'}
            </button>
            <span className="sr-only" role="status">
              {copied === 'copied' ? 'Markdown copied to the clipboard' : ''}
            </span>
          </div>
          <p className="subtle rep-fine">
            The report lists every finding, the upgrade commands and your reviewer decisions. AI assessments are labelled as advisory.
            {demo && ' Demo exports carry a "Demo data. Not a real scan." watermark.'}
          </p>
        </div>

        <div className="rep-preview-wrap">
          <h3 className="rep-sub">Markdown preview</h3>
          <pre className="code rep-preview" tabIndex={0} aria-label="Markdown report preview, scrollable">
            <code>{preview}</code>
          </pre>
          <p className="subtle rep-fine">
            Showing the first {Math.min(PREVIEW_LINES, lines.length)} of {lines.length} lines.
          </p>
        </div>
      </div>
    </section>
  )
}
