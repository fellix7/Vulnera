import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { ScanRequest } from '../types'
import { formatBytes } from '../lib/format'
import { collectSources, MAX_BYTES, MAX_FILES, type CollectedSources } from '../lib/sources'

interface Props {
  loading: boolean
  error: string | null
  onScan: (req: ScanRequest) => void
  onDemo: () => void
}

const STEPS = [
  'Reading your lockfile',
  'Matching packages against OSV.dev',
  'Enriching with EPSS and CISA KEV',
  'Ranking findings into tiers',
  'Asking Gemini whether your code calls the vulnerable function',
  'Planning safe upgrades',
]

function LoadingSteps({ withAi }: { withAi: boolean }) {
  const steps = withAi ? STEPS : STEPS.filter((s) => !s.startsWith('Asking Gemini'))
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 2200)
    return () => window.clearInterval(id)
  }, [steps.length])

  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <div>
        <strong>{steps[active]}…</strong>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s} className={i < active ? 'done' : i === active ? 'now' : ''}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export function ScanPanel({ loading, error, onScan, onDemo }: Props) {
  const [lockfile, setLockfile] = useState<unknown>(null)
  const [lockName, setLockName] = useState('')
  const [lockError, setLockError] = useState<string | null>(null)
  const [collected, setCollected] = useState<CollectedSources | null>(null)
  const [collecting, setCollecting] = useState(false)
  const [withAi, setWithAi] = useState(false)
  const lockInput = useRef<HTMLInputElement>(null)
  const dirInput = useRef<HTMLInputElement>(null)

  async function onLockfile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setLockfile(null)
    setLockError(null)
    setLockName(file?.name ?? '')
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('The top level of the file is not a JSON object.')
      }
      const o = parsed as Record<string, unknown>
      if (!('packages' in o) && !('dependencies' in o)) {
        throw new Error('This does not look like a package-lock.json (no "packages" or "dependencies" field).')
      }
      setLockfile(parsed)
    } catch (err) {
      const msg = err instanceof SyntaxError ? `That file is not valid JSON (${err.message}).` : (err as Error).message
      setLockError(msg)
    }
  }

  async function onFolder(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    setCollected(null)
    if (!files || files.length === 0) return
    setCollecting(true)
    try {
      setCollected(await collectSources(files))
    } finally {
      setCollecting(false)
    }
  }

  function clearFolder() {
    setCollected(null)
    if (dirInput.current) dirInput.current.value = ''
  }

  function scan() {
    if (!lockfile) return
    const sources = collected?.sources ?? []
    setWithAi(sources.length > 0)
    onScan(sources.length > 0 ? { lockfile, sources } : { lockfile })
  }

  function scanSample() {
    setWithAi(true)
    onScan({ sample: true })
  }

  const skippedTotal = collected
    ? Object.values(collected.skipped).reduce((a, b) => a + b, 0)
    : 0

  return (
    <section className="card scan-panel" aria-labelledby="scan-h">
      <h2 id="scan-h">Scan a project</h2>
      <div className="scan-grid">
        <div className="field">
          <label htmlFor="lockfile">
            1. package-lock.json <span className="req">required</span>
          </label>
          <input
            id="lockfile"
            ref={lockInput}
            type="file"
            accept=".json,application/json"
            onChange={onLockfile}
            disabled={loading}
          />
          {lockfile !== null && <p className="hint ok-text">Parsed {lockName}.</p>}
          {lockError && (
            <p className="hint err-text" role="alert">
              {lockError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="srcdir">
            2. Source folder <span className="opt">optional, enables the code check</span>
          </label>
          <input
            id="srcdir"
            ref={dirInput}
            type="file"
            // @ts-expect-error webkitdirectory is non-standard but supported by all major browsers
            webkitdirectory=""
            multiple
            onChange={onFolder}
            disabled={loading}
          />
          {collecting && <p className="hint">Reading files…</p>}
          {collected && (
            <div className="hint">
              <p>
                <strong>{collected.sources.length}</strong> source files ({formatBytes(collected.totalBytes)}) will be
                sent{collected.folderName ? ` from ${collected.folderName}/` : ''}.{' '}
                <button type="button" className="link-btn" onClick={clearFolder}>
                  Clear
                </button>
              </p>
              {skippedTotal > 0 && (
                <p className="skipped">
                  Skipped {skippedTotal}:
                  {collected.skipped.excludedDir > 0 && ` ${collected.skipped.excludedDir} in node_modules/dist/build/.git;`}
                  {collected.skipped.nonSource > 0 && ` ${collected.skipped.nonSource} non-source files;`}
                  {collected.skipped.overFileCap > 0 && ` ${collected.skipped.overFileCap} over the ${MAX_FILES}-file cap;`}
                  {collected.skipped.overSizeCap > 0 &&
                    ` ${collected.skipped.overSizeCap} over the ${formatBytes(MAX_BYTES)} total cap;`}
                  {collected.skipped.unreadable > 0 && ` ${collected.skipped.unreadable} unreadable;`}
                </p>
              )}
              {collected.sources.length === 0 && (
                <p className="err-text">No .js/.jsx/.ts/.tsx/.mjs/.cjs files found in that folder.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn primary" onClick={scan} disabled={!lockfile || loading || collecting}>
          {loading ? 'Scanning…' : 'Scan'}
        </button>
        <button type="button" className="btn" onClick={scanSample} disabled={loading}>
          Scan sample project
        </button>
        <button type="button" className="btn ghost" onClick={onDemo} disabled={loading}>
          View demo data
        </button>
      </div>
      <p className="hint privacy">
        Your project is only read, never installed or run. Only small snippets around usages go to Gemini.
      </p>

      {loading && <LoadingSteps withAi={withAi} />}
      {error && !loading && (
        <div className="alert err" role="alert">
          <strong>Scan failed.</strong> {error}
        </div>
      )}
    </section>
  )
}
