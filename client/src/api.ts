import type { ScanRequest, ScanResult } from './types'

export interface Health {
  ok: boolean
  offline: boolean
  gemini: boolean
}

export async function fetchHealth(): Promise<Health> {
  const r = await fetch('/api/health')
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()) as Health
}

/** POST /api/scan. Throws an Error with a user-readable message on any failure. */
export async function postScan(req: ScanRequest): Promise<ScanResult> {
  let res: Response
  try {
    res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    throw new Error('Could not reach the API. Is the server running?')
  }

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body; handled below
  }

  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Scan failed (HTTP ${res.status}).`
    throw new Error(msg)
  }

  const r = body as Partial<ScanResult> | null
  if (!r || !Array.isArray(r.findings) || !Array.isArray(r.plans)) {
    throw new Error('The server returned an unexpected response.')
  }
  return {
    scannedAt: r.scannedAt ?? new Date().toISOString(),
    packageCount: r.packageCount ?? 0,
    findings: r.findings,
    plans: r.plans,
    aiStatus: r.aiStatus ?? 'disabled',
    notes: Array.isArray(r.notes) ? r.notes : [],
  }
}
