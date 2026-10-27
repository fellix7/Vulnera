import { useId, useRef, type ChangeEvent } from 'react'
import { formatBytes } from '../../lib/format'
import { MAX_BYTES, MAX_FILES, type CollectedSources } from '../../lib/sources'
import { Icon } from '../ui/Icon'

interface Props {
  collected: CollectedSources | null
  collecting: boolean
  disabled: boolean
  /** Set when this server cannot run the AI code check; the picker is then disabled. */
  unavailable: string | null
  onFiles: (files: FileList) => void
  onClear: () => void
}

const SKIP_LABELS: { key: keyof CollectedSources['skipped']; text: (n: number) => string }[] = [
  { key: 'excludedDir', text: (n) => `${n.toLocaleString()} inside node_modules, dist, build or .git` },
  { key: 'nonSource', text: (n) => `${n.toLocaleString()} not .js, .jsx, .ts, .tsx, .mjs or .cjs` },
  { key: 'overFileCap', text: (n) => `${n.toLocaleString()} past the ${MAX_FILES}-file limit` },
  { key: 'overSizeCap', text: (n) => `${n.toLocaleString()} past the ${formatBytes(MAX_BYTES)} total limit` },
  { key: 'unreadable', text: (n) => `${n.toLocaleString()} unreadable` },
]

/** Optional source folder picker (webkitdirectory). Enables the AI code check. */
export function SourceFolder({ collected, collecting, disabled, unavailable, onFiles, onClear }: Props) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const off = disabled || unavailable !== null

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) onFiles(files)
  }

  function clear() {
    if (input.current) input.current.value = ''
    onClear()
  }

  const skipped = collected ? SKIP_LABELS.filter((s) => collected.skipped[s.key] > 0) : []
  const skippedTotal = collected ? Object.values(collected.skipped).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="scan-src">
      <input
        ref={input}
        id={inputId}
        className="sr-only"
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but supported by all major browsers
        webkitdirectory=""
        multiple
        disabled={off}
        onChange={onChange}
      />

      {unavailable && (
        <div className="scan-inline scan-inline--info">
          <Icon name="info" size={16} />
          <div>{unavailable}</div>
        </div>
      )}

      <div className="cluster">
        <label htmlFor={inputId} className={`btn${off ? ' is-disabled' : ''}`}>
          <Icon name="folder" size={14} />
          {collected ? 'Choose a different folder' : 'Choose source folder'}
        </label>
        {(collected || collecting) && (
          <button type="button" className="btn btn--ghost" onClick={clear} disabled={disabled}>
            <Icon name="x" size={14} />
            Clear
          </button>
        )}
        {collecting && (
          <span className="scan-reading" role="status">
            <span className="spinner" aria-hidden="true" />
            Reading files…
          </span>
        )}
      </div>

      {collected && !collecting && (
        <div className="scan-src__result" role="status">
          {collected.sources.length > 0 ? (
            <p>
              <span className="badge badge--ok">
                <Icon name="check" size={12} />
                {collected.sources.length.toLocaleString()} source {collected.sources.length === 1 ? 'file' : 'files'}
              </span>{' '}
              <span className="muted">
                {formatBytes(collected.totalBytes)}
                {collected.folderName ? ` from ${collected.folderName}/` : ''} will be sent to this server with the scan.
              </span>
            </p>
          ) : (
            <div className="scan-inline scan-inline--warn">
              <Icon name="alert" size={16} />
              <div>
                <strong>No source files found{collected.folderName ? ` in ${collected.folderName}/` : ''}.</strong> The scan will run without the AI code check.
                Pick the project root that holds your .js, .jsx, .ts, .tsx, .mjs or .cjs files.
              </div>
            </div>
          )}
          {skippedTotal > 0 && (
            <details className="scan-skipped">
              <summary>
                {skippedTotal.toLocaleString()} {skippedTotal === 1 ? 'file' : 'files'} skipped
              </summary>
              <ul>
                {skipped.map((s) => (
                  <li key={s.key}>{s.text(collected.skipped[s.key])}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
