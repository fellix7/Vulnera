import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react'
import { formatBytes } from '../../lib/format'
import { Icon } from '../ui/Icon'
import { pickDroppedFile, type LockfileInfo } from './lockfile'

interface Props {
  info: LockfileInfo | null
  error: string | null
  reading: boolean
  disabled: boolean
  onFile: (file: File) => void
  onClear: () => void
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/** Drop zone and file picker for package-lock.json. The picker input is visually hidden but keyboard-reachable. */
export function LockfileDrop({ info, error, reading, disabled, onFile, onClear }: Props) {
  const inputId = useId()
  const titleId = useId()
  const hintId = useId()
  const input = useRef<HTMLInputElement>(null)
  const depth = useRef(0)
  const [over, setOver] = useState(false)

  // A file dropped outside the zone would make the browser navigate to it and lose the page state.
  useEffect(() => {
    const stop = (e: globalThis.DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again after a fix
    if (file) onFile(file)
  }

  function onDragEnter(e: DragEvent) {
    if (disabled || !hasFiles(e)) return
    e.preventDefault()
    depth.current++
    setOver(true)
  }
  function onDragOver(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }
  function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setOver(false)
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    depth.current = 0
    setOver(false)
    if (disabled) return
    const file = pickDroppedFile(e.dataTransfer.files)
    if (file) onFile(file)
  }

  // Mouse convenience: the whole empty zone opens the picker. Keyboard users use the hidden input / label.
  function onZoneClick(e: MouseEvent) {
    if (disabled || info) return
    if ((e.target as HTMLElement).closest('label, button, a, input')) return
    input.current?.click()
  }

  return (
    <div className="scan-lock">
      <div
        role="group"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        aria-busy={reading}
        className={`scan-drop${over ? ' is-over' : ''}${info ? ' has-file' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onZoneClick}
      >
        <input
          ref={input}
          id={inputId}
          className="sr-only"
          type="file"
          accept=".json,application/json"
          disabled={disabled}
          onChange={onChange}
        />

        {info ? (
          <div className="scan-file">
            <div className="scan-file__head">
              <span className="scan-file__icon" aria-hidden="true">
                <Icon name="file" size={18} />
              </span>
              <div className="scan-file__name">
                <strong id={titleId} className="truncate" title={info.fileName}>
                  {info.fileName}
                </strong>
                <span className="subtle">Read in your browser. Not uploaded until you run the scan.</span>
              </div>
              {info.legacyFormat ? (
                <span className="badge badge--warn">
                  <Icon name="alert" size={12} />
                  Old format
                </span>
              ) : (
                <span className="badge badge--ok">
                  <Icon name="check" size={12} />
                  Lockfile format found
                </span>
              )}
            </div>
            <dl className="scan-facts">
              <div>
                <dt>File size</dt>
                <dd className="num">{formatBytes(info.size)}</dd>
              </div>
              <div>
                <dt>lockfileVersion</dt>
                <dd className="num">{info.version ?? 'not stated'}</dd>
              </div>
              <div>
                <dt>Project name</dt>
                <dd className="truncate" title={info.projectName ?? undefined}>
                  {info.projectName ?? <span className="subtle">not set</span>}
                </dd>
              </div>
              <div>
                <dt>{info.entriesFrom === 'packages' ? 'Installed entries' : 'Top-level dependencies'}</dt>
                <dd className="num">{info.entries.toLocaleString()}</dd>
              </div>
            </dl>
            <div className="cluster">
              <label htmlFor={inputId} className={`btn btn--sm${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled}>
                <Icon name="refresh" size={14} />
                Choose a different file
              </label>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClear} disabled={disabled}>
                <Icon name="x" size={14} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="scan-drop__target">
            <span className="scan-drop__icon" aria-hidden="true">
              {reading ? <span className="spinner" /> : <Icon name="upload" size={20} />}
            </span>
            <strong id={titleId} className="scan-drop__title">
              {reading ? 'Reading file…' : over ? 'Drop to read the file' : 'Drop your package-lock.json here'}
            </strong>
            <span className="scan-drop__or">
              <span className="subtle">or</span>
              <label htmlFor={inputId} className={`btn btn--sm${disabled ? ' is-disabled' : ''}`} aria-disabled={disabled}>
                Choose file
              </label>
            </span>
          </div>
        )}
      </div>

      <p id={hintId} className={info ? 'sr-only' : 'scan-hint'}>
        JSON file up to 10 MB, written by npm 7 or newer (lockfileVersion 2 or 3). It is parsed in your browser first.
      </p>

      {error && (
        <div className="scan-inline scan-inline--danger" role="alert">
          <Icon name="alert" size={16} />
          <div>
            <strong>Could not use that file.</strong> {error}
          </div>
        </div>
      )}

      {info?.unusualName && (
        <div className="scan-inline scan-inline--warn">
          <Icon name="info" size={16} />
          <div>
            <strong>{info.fileName}</strong> is not named package-lock.json. It will be scanned anyway, as long as it is an npm lockfile.
          </div>
        </div>
      )}

      {info?.legacyFormat && (
        <div className="scan-inline scan-inline--warn" role="alert">
          <Icon name="alert" size={16} />
          <div>
            <strong>This looks like an old lockfile</strong> (lockfileVersion {info.version ?? '1'}, no "packages" map). The server only reads npm 7+
            lockfiles and will reject it. Regenerate it with <code>npm install --package-lock-only</code> and upload the new file.
          </div>
        </div>
      )}
    </div>
  )
}
