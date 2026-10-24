import { useMemo, useState } from 'react'
import { postScan } from './api'
import { Banners } from './components/Banners'
import { DetailPanel } from './components/DetailPanel'
import { ExportBar } from './components/ExportBar'
import { FindingsList } from './components/FindingsList'
import { Funnel } from './components/Funnel'
import { Header } from './components/Header'
import { ScanPanel } from './components/ScanPanel'
import { UpgradeTable } from './components/UpgradeTable'
import { computeFunnel } from './lib/funnel'
import { findingKey, type Review, type ReviewState } from './lib/review'
import { MOCK_RESULT } from './mock'
import type { ScanRequest, ScanResult } from './types'

// ?mock=1 starts with demo data instead of calling the API.
const START_MOCK = new URLSearchParams(window.location.search).get('mock') === '1'

function App() {
  const [result, setResult] = useState<ScanResult | null>(START_MOCK ? MOCK_RESULT : null)
  const [isMock, setIsMock] = useState(START_MOCK)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewState>({})
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  async function runScan(req: ScanRequest) {
    setLoading(true)
    setError(null)
    setSelectedKey(null)
    // Drop the previous scan so a failure never shows old results next to the new error.
    setResult(null)
    setReview({})
    try {
      const r = await postScan(req)
      setResult(r)
      setIsMock(false)
      setReview({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function showDemo() {
    setError(null)
    setSelectedKey(null)
    setResult(MOCK_RESULT)
    setIsMock(true)
    setReview({})
  }

  const funnel = useMemo(() => (result ? computeFunnel(result.findings, review) : null), [result, review])
  const selected = useMemo(
    () => (result && selectedKey ? (result.findings.find((f) => findingKey(f) === selectedKey) ?? null) : null),
    [result, selectedKey],
  )

  function updateReview(key: string, next: Review) {
    setReview((prev) => ({ ...prev, [key]: next }))
  }

  return (
    <div className="app">
      <Header />
      <main>
        <ScanPanel loading={loading} error={error} onScan={runScan} onDemo={showDemo} />

        {result && funnel && (
          <>
            <Banners result={result} isMock={isMock} />
            <ExportBar result={result} review={review} isMock={isMock} />
            <Funnel counts={funnel} aiOff={result.aiStatus !== 'ok'} />
            <FindingsList
              findings={result.findings}
              review={review}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
            <UpgradeTable plans={result.plans} findings={result.findings} />
          </>
        )}

        {!result && !loading && (
          <section className="card empty-state">
            <h2>No results yet</h2>
            <p className="muted">
              Upload a package-lock.json, scan the sample project, or open the demo data to see the dashboard.
            </p>
          </section>
        )}
      </main>
      <footer className="app-footer">
        Vulnera matches packages to advisories with an exact OSV.dev lookup. AI only adds context and needs human confirmation.
      </footer>

      {result && selected && (
        <DetailPanel
          key={selectedKey}
          finding={selected}
          plan={result.plans.find((p) => p.name === selected.pkg.name && p.from === selected.pkg.version)}
          review={review[selectedKey!]}
          onChange={(next) => updateReview(selectedKey!, next)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  )
}

export default App
