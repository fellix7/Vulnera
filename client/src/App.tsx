import { useEffect, useState } from 'react'

interface Health {
  ok: boolean
  offline: boolean
  gemini: boolean
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError('API not reachable. Is the server running?'))
  }, [])

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 16px' }}>
      <h1 style={{ margin: 0 }}>Vulnera</h1>
      <p style={{ color: 'var(--muted)', marginTop: 8 }}>
        Tells you which vulnerable dependencies to fix first, and why.
      </p>

      <section
        style={{
          marginTop: 32,
          padding: 16,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        {error && <p style={{ color: 'var(--warn)', margin: 0 }}>{error}</p>}
        {!error && !health && <p style={{ margin: 0 }}>Checking API…</p>}
        {health && (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>API: <strong style={{ color: 'var(--ok)' }}>connected</strong></li>
            <li>Gemini key: {health.gemini ? 'configured' : <span style={{ color: 'var(--warn)' }}>missing (add GEMINI_API_KEY to .env)</span>}</li>
            <li>Mode: {health.offline ? 'offline (snapshots only)' : 'online'}</li>
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
