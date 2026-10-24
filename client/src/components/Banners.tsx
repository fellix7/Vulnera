import type { ScanResult } from '../types'

export function Banners({ result, isMock }: { result: ScanResult; isMock: boolean }) {
  return (
    <div className="banners">
      {isMock && (
        <div className="alert info" role="note">
          <strong>Demo data.</strong> These findings are illustrative, not the result of a live scan.
        </div>
      )}
      {result.aiStatus === 'disabled' && (
        <div className="alert warn" role="note">
          AI analysis off — add GEMINI_API_KEY (and upload your source folder) to check whether your code calls the
          vulnerable function.
        </div>
      )}
      {result.aiStatus === 'error' && (
        <div className="alert warn" role="note">
          AI analysis error — the Gemini step failed, so the rule-based results below are shown without code-usage
          verdicts.
        </div>
      )}
      {result.notes.length > 0 && (
        <div className="alert subtle" role="note">
          <ul>
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
