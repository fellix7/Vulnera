import type { ScanResult } from '../types'
import { downloadText } from '../lib/download'
import { buildJson, buildMarkdown } from '../lib/report'
import type { ReviewState } from '../lib/review'

interface Props {
  result: ScanResult
  review: ReviewState
  isMock: boolean
}

export function ExportBar({ result, review, isMock }: Props) {
  const stamp = result.scannedAt.slice(0, 10)
  return (
    <section className="export-bar" aria-label="Export">
      <p className="muted">
        {result.packageCount} packages inspected · {result.findings.length} findings · scanned {result.scannedAt.slice(0, 19).replace('T', ' ')} UTC
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => downloadText(`vulnera-${stamp}.json`, buildJson(result, review), 'application/json')}
        >
          Download JSON
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadText(`vulnera-report-${stamp}.md`, buildMarkdown(result, review, isMock ? 'mock' : 'api'), 'text/markdown')
          }
        >
          Download Markdown report
        </button>
      </div>
    </section>
  )
}
