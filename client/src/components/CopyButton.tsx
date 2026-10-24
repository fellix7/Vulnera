import { useEffect, useRef, useState } from 'react'
import { copyText } from '../lib/download'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function onClick() {
    const ok = await copyText(text)
    setState(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1600)
  }

  return (
    <button type="button" className="btn small" onClick={onClick}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}
