import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchHealth, postScan, type Health } from '../api'
import type { Review, ReviewState } from '../lib/review'
import { MOCK_RESULT } from '../mock'
import type { ScanRequest, ScanResult, SourceFile } from '../types'

// One scan the user can look at. 'demo' records are illustrative data and never enter history.
export type ScanSource = 'upload' | 'sample' | 'demo'

export interface ScanRecord {
  id: string
  source: ScanSource
  projectName: string
  fileName?: string
  sourceFileCount: number // source files sent for the AI code check (0 = none)
  result: ScanResult
  review: ReviewState
  savedAt: string
}

export interface ScanInput {
  request: ScanRequest
  source: 'upload' | 'sample'
  projectName: string
  fileName?: string
}

export interface ScanStore {
  current: ScanRecord | null
  status: 'idle' | 'scanning' | 'error'
  error: string | null
  /** True while the running scan includes source files (so the AI step will run). */
  scanningWithAi: boolean
  /** Real scans, newest first. Persisted in this browser only. */
  history: ScanRecord[]
  /** Source files of the current upload, kept in memory only (never persisted) for code context. */
  sources: SourceFile[] | null
  health: Health | null
  healthFailed: boolean
  runScan(input: ScanInput): Promise<boolean>
  loadDemo(): void
  openScan(id: string): void
  closeScan(): void
  deleteScan(id: string): void
  clearHistory(): void
  setReview(key: string, next: Review): void
  dismissError(): void
}

const HISTORY_KEY = 'vulnera:history:v1'
const CURRENT_KEY = 'vulnera:current:v1'
const DEMO_ID = 'demo'
const MAX_HISTORY = 8

const DEMO_RECORD = (): ScanRecord => ({
  id: DEMO_ID,
  source: 'demo',
  projectName: 'Demo project',
  sourceFileCount: 0,
  result: MOCK_RESULT,
  review: {},
  savedAt: MOCK_RESULT.scannedAt,
})

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Save history, dropping the oldest scans if the browser's storage quota is exceeded. */
function writeHistory(list: ScanRecord[]) {
  let items = list.slice(0, MAX_HISTORY)
  while (true) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
      return
    } catch {
      if (items.length <= 1) {
        try {
          localStorage.removeItem(HISTORY_KEY)
        } catch {
          /* storage unavailable */
        }
        return
      }
      items = items.slice(0, -1)
    }
  }
}

function writeCurrent(id: string | null) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id)
    else localStorage.removeItem(CURRENT_KEY)
  } catch {
    /* storage unavailable */
  }
}

function isRecord(x: unknown): x is ScanRecord {
  const r = x as ScanRecord
  return !!r && typeof r.id === 'string' && !!r.result && Array.isArray(r.result.findings) && Array.isArray(r.result.plans)
}

const Ctx = createContext<ScanStore | null>(null)

export function ScanProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ScanRecord[]>(() => readJson<unknown[]>(HISTORY_KEY, []).filter(isRecord))
  const [current, setCurrent] = useState<ScanRecord | null>(() => {
    const id = safeGet(CURRENT_KEY)
    if (id === DEMO_ID) return DEMO_RECORD()
    return history.find((r) => r.id === id) ?? null
  })
  const [status, setStatus] = useState<ScanStore['status']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [scanningWithAi, setScanningWithAi] = useState(false)
  const [sources, setSources] = useState<SourceFile[] | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [healthFailed, setHealthFailed] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealthFailed(true))
  }, [])

  useEffect(() => writeHistory(history), [history])

  const runScan = useCallback(async (input: ScanInput) => {
    setStatus('scanning')
    setError(null)
    const withSources = input.request.sources ?? []
    setScanningWithAi(input.source === 'sample' || withSources.length > 0)
    try {
      const result = await postScan(input.request)
      const record: ScanRecord = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        source: input.source,
        projectName: input.projectName,
        fileName: input.fileName,
        sourceFileCount: input.source === 'sample' ? -1 : withSources.length,
        result,
        review: {},
        savedAt: new Date().toISOString(),
      }
      setCurrent(record)
      setSources(withSources.length ? withSources : null)
      setHistory((h) => [record, ...h.filter((r) => r.id !== record.id)].slice(0, MAX_HISTORY))
      writeCurrent(record.id)
      setStatus('idle')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
      return false
    }
  }, [])

  const loadDemo = useCallback(() => {
    setCurrent(DEMO_RECORD())
    setSources(null)
    writeCurrent(DEMO_ID)
  }, [])

  const openScan = useCallback(
    (id: string) => {
      if (id === DEMO_ID) return loadDemo()
      const r = history.find((x) => x.id === id)
      if (!r) return
      setCurrent(r)
      setSources(null)
      writeCurrent(r.id)
    },
    [history, loadDemo],
  )

  const closeScan = useCallback(() => {
    setCurrent(null)
    setSources(null)
    writeCurrent(null)
  }, [])

  const deleteScan = useCallback((id: string) => {
    setHistory((h) => h.filter((r) => r.id !== id))
    setCurrent((c) => {
      if (c?.id !== id) return c
      writeCurrent(null)
      return null
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrent((c) => {
      if (c && c.source !== 'demo') {
        writeCurrent(null)
        return null
      }
      return c
    })
  }, [])

  const setReview = useCallback((key: string, next: Review) => {
    setCurrent((c) => {
      if (!c) return c
      const updated = { ...c, review: { ...c.review, [key]: next } }
      if (c.source !== 'demo') setHistory((h) => h.map((r) => (r.id === c.id ? updated : r)))
      return updated
    })
  }, [])

  const dismissError = useCallback(() => {
    setError(null)
    setStatus('idle')
  }, [])

  const value = useMemo<ScanStore>(
    () => ({
      current,
      status,
      error,
      scanningWithAi,
      history,
      sources,
      health,
      healthFailed,
      runScan,
      loadDemo,
      openScan,
      closeScan,
      deleteScan,
      clearHistory,
      setReview,
      dismissError,
    }),
    [current, status, error, scanningWithAi, history, sources, health, healthFailed, runScan, loadDemo, openScan, closeScan, deleteScan, clearHistory, setReview, dismissError],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useScan(): ScanStore {
  const s = useContext(Ctx)
  if (!s) throw new Error('useScan must be used inside <ScanProvider>')
  return s
}

export const SOURCE_LABEL: Record<ScanSource, string> = {
  upload: 'Live scan',
  sample: 'Sample project scan',
  demo: 'Demo data',
}
