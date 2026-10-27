import { useEffect, useMemo, useState } from 'react'
import { Compare } from '../components/reports/Compare'
import { CurrentReport } from '../components/reports/CurrentReport'
import { EvidenceLog } from '../components/reports/EvidenceLog'
import { History } from '../components/reports/History'
import { Callout, NoScan, PageHeader } from '../components/ui/Kit'
import { useScan } from '../state/store'
import './reports.css'

export default function ReportsPage() {
  const { current, history } = useScan()
  // Demo data never enters history; filter anyway so it can never be compared or listed as a saved scan.
  const scans = useMemo(() => history.filter((r) => r.source !== 'demo'), [history])

  const [picked, setPicked] = useState<string[]>([])
  const [baselineId, setBaselineId] = useState<string | null>(null)
  const [latestId, setLatestId] = useState<string | null>(null)

  // Links such as /reports#compare land on the compare section.
  useEffect(() => {
    if (window.location.hash === '#compare') document.getElementById('compare')?.scrollIntoView({ block: 'start' })
  }, [])

  const validPicked = picked.filter((id) => scans.some((r) => r.id === id))

  function togglePick(id: string) {
    const next = validPicked.includes(id) ? validPicked.filter((x) => x !== id) : validPicked.length >= 2 ? validPicked : [...validPicked, id]
    setPicked(next)
    if (next.length === 2) {
      // History is newest first, so the higher index is the older scan.
      const [older, newer] = [...next].sort((a, b) => scans.findIndex((r) => r.id === b) - scans.findIndex((r) => r.id === a))
      setBaselineId(older!)
      setLatestId(newer!)
    }
  }

  function compareSelected() {
    document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('compare')?.focus({ preventScroll: true })
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports & history"
        title="Reports"
        description="Export the current scan, reopen earlier scans from this browser, and compare two scans to see what an upgrade resolved."
      />

      <div className="stack rep-page">
        {current?.source === 'demo' && (
          <Callout tone="demo">
            <strong>Demo data.</strong> This report is illustrative. Exports are watermarked "Demo data. Not a real scan." and demo scans are never added to your
            history.
          </Callout>
        )}

        {current ? <CurrentReport current={current} /> : <NoScan what="the current report" />}

        <History scans={scans} currentId={current?.id ?? null} picked={validPicked} onTogglePick={togglePick} onCompareSelected={compareSelected} />

        <Compare
          scans={scans}
          current={current}
          baselineId={baselineId}
          latestId={latestId}
          onBaseline={(id) => {
            setBaselineId(id)
            setPicked([])
          }}
          onLatest={(id) => {
            setLatestId(id)
            setPicked([])
          }}
          onSwap={(b, l) => {
            setBaselineId(b)
            setLatestId(l)
            setPicked([])
          }}
        />

        {current && <EvidenceLog current={current} />}
      </div>
    </>
  )
}
