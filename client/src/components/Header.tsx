import { useEffect, useState } from 'react'
import { fetchHealth, type Health } from '../api'

export function Header() {
  const [health, setHealth] = useState<Health | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setOffline(true))
  }, [])

  return (
    <header className="app-header">
      <div>
        <h1>
          <span className="logo" aria-hidden="true">
            ◆
          </span>
          Vulnera
        </h1>
        <p className="tagline">Know which vulnerable dependencies to fix first — and why.</p>
      </div>
      <ul className="status" aria-label="API status">
        {!health && !offline && <li className="pill">Checking API…</li>}
        {offline && (
          <li className="pill bad">
            <span className="dot" aria-hidden="true" />
            API not reachable
          </li>
        )}
        {health && (
          <>
            <li className="pill ok">
              <span className="dot" aria-hidden="true" />
              API connected
            </li>
            <li className={`pill ${health.gemini ? 'ok' : 'warn'}`}>
              <span className="dot" aria-hidden="true" />
              {health.gemini ? 'Gemini key configured' : 'Gemini key missing'}
            </li>
            <li className={`pill ${health.offline ? 'warn' : 'ok'}`}>
              <span className="dot" aria-hidden="true" />
              {health.offline ? 'Offline mode (snapshots)' : 'Online'}
            </li>
          </>
        )}
      </ul>
    </header>
  )
}
