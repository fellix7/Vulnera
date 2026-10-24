export function formatEpss(epss: number | null): string {
  if (epss === null) return 'No data'
  const pct = epss * 100
  return `${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%`
}

/** Advisory references are untrusted: only plain http/https links are rendered as links. */
export function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Dependency chain ending in the package itself. */
export function depPath(path: string[], name: string): string[] {
  if (path.length === 0) return [name]
  return path[path.length - 1] === name ? path : [...path, name]
}
