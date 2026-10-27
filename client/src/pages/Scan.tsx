import { useCallback, useEffect, useRef, useState } from 'react'
import { LockfileDrop } from '../components/scan/LockfileDrop'
import { MAX_REQUEST_BYTES, readLockfile, stripExtension, type LockfileInfo } from '../components/scan/lockfile'
import { ScanProgress } from '../components/scan/ScanProgress'
import { ScanSide } from '../components/scan/ScanSide'
import { SourceFolder } from '../components/scan/SourceFolder'
import { Icon } from '../components/ui/Icon'
import { Callout, PageHeader } from '../components/ui/Kit'
import { formatBytes } from '../lib/format'
import { collectSources, type CollectedSources } from '../lib/sources'
import { Link, navigate } from '../router'
import { useScan, type ScanInput } from '../state/store'
import './scan.css'

// Survives leaving and returning to /scan while a request is in flight, so the clock and retry keep working.
const lastRun = { startedAt: 0, label: '', kind: 'upload' as 'upload' | 'sample' }

const SAMPLE_NAME = 'QuickNotes (sample)'

export default function ScanPage() {
  const { current, status, error, scanningWithAi, health, healthFailed, runScan, loadDemo, dismissError } = useScan()
  const scanning = status === 'scanning'

  const [info, setInfo] = useState<LockfileInfo | null>(null)
  const [lockError, setLockError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [collected, setCollected] = useState<CollectedSources | null>(null)
  const [collecting, setCollecting] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const [fallbackStart] = useState(() => Date.now())
  const mounted = useRef(true)
  const readSeq = useRef(0)
  const folderSeq = useRef(0)
  const errorBox = useRef<HTMLDivElement>(null)
  const progressBox = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Bring the status panel into view when a scan starts or fails (the Run button can be far below it).
  useEffect(() => {
    if (status === 'error') errorBox.current?.scrollIntoView({ block: 'nearest' })
    if (status === 'scanning') progressBox.current?.scrollIntoView({ block: 'nearest' })
  }, [status])

  const aiOff = health !== null && !health.gemini
  const aiUnavailable = aiOff && !health.offline
  const aiUnavailableText = aiUnavailable
    ? 'The AI code check is unavailable on this server (no Gemini API key is configured). The scan still works; findings will show “Not assessed” for code usage.'
    : null

  const sourceCount = collected?.sources.length ?? 0
  const willUseAi = sourceCount > 0 && !aiUnavailable

  const onLockfile = useCallback(async (file: File) => {
    const seq = ++readSeq.current
    setInfo(null)
    setLockError(null)
    setSizeError(null)
    setReading(true)
    const result = await readLockfile(file)
    if (seq !== readSeq.current) return
    setReading(false)
    if (result.ok) setInfo(result.info)
    else setLockError(result.error)
  }, [])

  const clearLockfile = useCallback(() => {
    readSeq.current++
    setInfo(null)
    setLockError(null)
    setSizeError(null)
    setReading(false)
  }, [])

  const onFolder = useCallback(async (files: FileList) => {
    const seq = ++folderSeq.current
    setCollected(null)
    setSizeError(null)
    setCollecting(true)
    try {
      const result = await collectSources(files)
      if (seq === folderSeq.current) setCollected(result)
    } finally {
      if (seq === folderSeq.current) setCollecting(false)
    }
  }, [])

  const clearFolder = useCallback(() => {
    folderSeq.current++
    setCollected(null)
    setCollecting(false)
    setSizeError(null)
  }, [])

  async function start(input: ScanInput, label: string, kind: 'upload' | 'sample') {
    lastRun.startedAt = Date.now()
    lastRun.label = label
    lastRun.kind = kind
    const ok = await runScan(input)
    // If the person moved to another page while waiting, do not pull them back.
    if (ok && mounted.current) navigate('/overview')
  }

  function runUpload() {
    if (!info) return
    const sources = aiUnavailable ? [] : (collected?.sources ?? [])
    const request = sources.length ? { lockfile: info.lockfile, sources } : { lockfile: info.lockfile }

    // Lockfile plus source files must fit the server's JSON body limit.
    if (info.size + (collected?.totalBytes ?? 0) > MAX_REQUEST_BYTES * 0.8) {
      const bytes = new Blob([JSON.stringify(request)]).size
      if (bytes > MAX_REQUEST_BYTES) {
        setSizeError(
          `The lockfile and source files together are ${formatBytes(bytes)}, over the server's 10 MB request limit. Remove the source folder or choose a smaller one.`,
        )
        return
      }
    }
    setSizeError(null)
    void start(
      {
        request,
        source: 'upload',
        projectName: (info.projectName ?? stripExtension(info.fileName)).trim() || info.fileName,
        fileName: info.fileName,
      },
      info.projectName ?? info.fileName,
      'upload',
    )
  }

  function runSample() {
    void start({ request: { sample: true }, source: 'sample', projectName: SAMPLE_NAME }, SAMPLE_NAME, 'sample')
  }

  function exploreDemo() {
    loadDemo()
    navigate('/overview')
  }

  function retry() {
    if (lastRun.kind === 'sample') runSample()
    else if (info) runUpload()
    else dismissError()
  }

  const canRun = !!info && !scanning && !collecting && !reading
  const apiHint = error ? /reach the API/i.test(error) : false

  return (
    <div className="scan-page">
      <PageHeader
        eyebrow="New scan"
        title="Scan a project"
        description="Upload your package-lock.json to see which known vulnerabilities in your dependencies deserve attention first, and the smallest safe upgrade for each."
      />

      {current && !scanning && (
        <p className="scan-current">
          <Icon name="layers" size={14} />
          <span className="truncate">
            Current scan: <strong>{current.projectName}</strong>
          </span>
          <Link to="/overview" className="link">
            Open overview
          </Link>
        </p>
      )}

      <div className="scan-layout">
        <div className="scan-main">
          {healthFailed && (
            <Callout tone="warn" role="status">
              <strong>The scan API is not reachable.</strong> Scanning needs the Vulnera server. From the project root, run <code>npm run dev</code> to start it. You can still{' '}
              <button type="button" className="link-btn" onClick={exploreDemo} disabled={scanning}>
                explore the demo data
              </button>
              .
            </Callout>
          )}
          {health?.offline && (
            <Callout tone="info">
              <strong>This server is in offline mode.</strong> It answers from saved snapshots, so the bundled sample project works but an arbitrary lockfile may be refused.
            </Callout>
          )}

          {scanning && (
            <div ref={progressBox}>
              <ScanProgress
                withAi={scanningWithAi && !aiUnavailable}
                startedAt={lastRun.startedAt || fallbackStart}
                label={lastRun.label || 'your project'}
              />
            </div>
          )}

          {status === 'error' && error && (
            <div ref={errorBox}>
              <Callout tone="danger" role="alert">
                <strong>The scan did not finish.</strong> {error}
                {apiHint && (
                  <>
                    {' '}
                    Start the server with <code>npm run dev</code> from the project root, then try again.
                  </>
                )}
                <div className="cluster scan-error-actions">
                  <button type="button" className="btn btn--sm" onClick={retry}>
                    <Icon name="refresh" size={14} />
                    Try again
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={dismissError}>
                    Dismiss
                  </button>
                </div>
              </Callout>
              {lastRun.kind === 'upload' && info && <p className="scan-hint">Your chosen files are still selected below.</p>}
            </div>
          )}

          <section className="scan-step" aria-labelledby="scan-s1">
            <span className="scan-step__n" aria-hidden="true">
              {info ? <Icon name="check" size={14} /> : '01'}
            </span>
            <div className="scan-step__body">
              <div className="scan-step__head">
                <h2 id="scan-s1">Lockfile</h2>
                <span className="badge">Required</span>
              </div>
              <p className="scan-step__lede">The package-lock.json from the root of your project. It lists every package and version that npm installed.</p>
              <LockfileDrop info={info} error={lockError} reading={reading} disabled={scanning} onFile={onLockfile} onClear={clearLockfile} />
            </div>
          </section>

          <section className="scan-step" aria-labelledby="scan-s2">
            <span className="scan-step__n" aria-hidden="true">
              {collected && sourceCount > 0 ? <Icon name="check" size={14} /> : '02'}
            </span>
            <div className="scan-step__body">
              <div className="scan-step__head">
                <h2 id="scan-s2">Source folder</h2>
                <span className="badge">Optional</span>
                <span className="badge badge--ai">
                  <Icon name="sparkle" size={12} />
                  Enables the AI code check
                </span>
              </div>
              <p className="scan-step__lede">
                With your code, Vulnera can check whether it actually calls the vulnerable function. Only files that import a vulnerable package are analysed, and only short
                snippets around those uses go to Gemini. Nothing is installed or executed. Up to 300 files and 3 MB are read; without a folder, findings show “Not assessed”.
              </p>
              <SourceFolder
                collected={collected}
                collecting={collecting}
                disabled={scanning}
                unavailable={aiUnavailableText}
                onFiles={onFolder}
                onClear={clearFolder}
              />
            </div>
          </section>

          <div className="scan-run">
            <button type="button" className="btn btn--primary btn--lg" onClick={runUpload} disabled={!canRun} aria-describedby="scan-run-note">
              <Icon name="play" size={14} />
              {scanning ? 'Scanning…' : 'Run scan'}
            </button>
            <p id="scan-run-note" className="scan-run__note">
              {!info
                ? 'Add a package-lock.json to enable the scan.'
                : willUseAi
                  ? `Ready: ${info.fileName} plus ${sourceCount.toLocaleString()} source ${sourceCount === 1 ? 'file' : 'files'}. The AI code check will run.`
                  : `Ready: ${info.fileName}. Without source files the AI code check will not run and findings show “Not assessed”.`}
            </p>
          </div>
          {sizeError && (
            <div className="scan-inline scan-inline--danger" role="alert">
              <Icon name="alert" size={16} />
              <div>{sizeError}</div>
            </div>
          )}

          <section className="scan-alt" aria-labelledby="scan-alt-h">
            <h2 id="scan-alt-h">No lockfile handy?</h2>
            <div className="scan-alt__grid">
              <div className="scan-alt__item">
                <h3>Scan the bundled sample project</h3>
                <p>
                  A real pipeline run on QuickNotes, a deliberately outdated demo app in <code>samples/demo-app</code> (lockfile and source code). Live data lookups
                  {aiUnavailable ? '' : ', plus the AI step when a Gemini key is set,'} can take up to a minute.
                </p>
                {aiUnavailable && <p className="subtle">The AI code check is unavailable on this server, so sample findings show “Not assessed”.</p>}
                <button type="button" className="btn" onClick={runSample} disabled={scanning}>
                  <Icon name="package" size={14} />
                  Scan the sample project
                </button>
              </div>
              <div className="scan-alt__item">
                <h3>Explore demo data</h3>
                <p>
                  Illustrative example findings, shown instantly. It is <strong>not a real scan</strong>, is labelled “Demo data” wherever it appears, and is never saved to
                  your history.
                </p>
                <button type="button" className="btn" onClick={exploreDemo} disabled={scanning}>
                  <Icon name="beaker" size={14} />
                  Explore demo data
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="scan-side" aria-label="About scanning">
          <ScanSide />
        </aside>
      </div>
    </div>
  )
}
