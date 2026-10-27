// Pure helpers for the code-evidence views. Nothing here invents text: every returned string is either
// copied from the scan data, from the user's own source files, or is fixed explanatory copy.
import type { AiVerdict, Finding, ScanResult } from '../../types'

export type Citation = AiVerdict['citations'][number]

// Same normalisation the server uses in validateCitations (server/src/pipeline/ai.ts).
export const normWs = (s: string) => s.replace(/\s+/g, ' ').trim()
export const normPath = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '').trim()

export interface ContextLine {
  no: number
  text: string
  hit: boolean
}

export interface CitationContext {
  lines: ContextLine[]
  /** First line (1-based) where the quote was actually found in the file; may differ from the cited line by 1. */
  foundAt: number
}

const MAX_LINE_CHARS = 600
const clip = (s: string) => (s.length > MAX_LINE_CHARS ? `${s.slice(0, MAX_LINE_CHARS)} …` : s)

/**
 * Real lines from the user's file around a citation. Mirrors the server check: the whitespace-normalised
 * quote must be contained in the cited line or its neighbours (line ±1). Returns null when it is not found,
 * so the caller falls back to showing only the quote, never an invented line.
 */
export function contextFor(content: string, c: Citation, radius = 3): CitationContext | null {
  const lines = content.split(/\r\n|\n/)
  const quote = normWs(c.quote)
  if (!quote || !Number.isInteger(c.line) || c.line < 1 || c.line > lines.length) return null

  const lo = Math.max(1, c.line - 1)
  const hi = Math.min(lines.length, c.line + 1)
  let hit: [number, number] | null = null
  for (let len = 1; len <= hi - lo + 1 && !hit; len++) {
    const starts: number[] = []
    for (let s = lo; s + len - 1 <= hi; s++) starts.push(s)
    // Prefer ranges that contain the cited line, then those closest to it.
    const rank = (s: number) => (s <= c.line && c.line <= s + len - 1 ? 0 : 100) + Math.abs(s - c.line)
    starts.sort((a, b) => rank(a) - rank(b))
    for (const s of starts) {
      if (normWs(lines.slice(s - 1, s - 1 + len).join(' ')).includes(quote)) {
        hit = [s, s + len - 1]
        break
      }
    }
  }
  if (!hit) return null

  const from = Math.max(1, hit[0] - radius)
  const to = Math.min(lines.length, hit[1] + radius)
  const out: ContextLine[] = []
  for (let no = from; no <= to; no++) out.push({ no, text: clip(lines[no - 1] ?? ''), hit: no >= hit[0] && no <= hit[1] })
  return { lines: out, foundAt: hit[0] }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** API names worth matching: the advisory-named functions or options, ignoring 1-character noise. */
export const usableApis = (apis: string[] | undefined) => [...new Set((apis ?? []).map((a) => a.trim()).filter((a) => a.length >= 2))]

/** Split text into plain / matched parts (case-insensitive) so matches can be marked without raw HTML. */
export function splitByTerms(text: string, terms: string[]): { text: string; hit: boolean }[] {
  const t = usableApis(terms)
  if (t.length === 0) return [{ text, hit: false }]
  const re = new RegExp(`(${t.sort((a, b) => b.length - a.length).map(escapeRe).join('|')})`, 'gi')
  return text
    .split(re)
    .map((part, i) => ({ text: part, hit: i % 2 === 1 }))
    .filter((p) => p.text.length > 0)
}

/** Sentences of the advisory text that mention any of the named APIs (simple case-insensitive substring match). */
export function matchingSentences(details: string, apis: string[] | undefined, max = 3): string[] {
  const terms = usableApis(apis).map((a) => a.toLowerCase())
  if (!details || terms.length === 0) return []
  const out: string[] = []
  for (const raw of details.split(/(?<=[.!?])\s+|\n{2,}/)) {
    const s = normWs(raw)
    const lower = s.toLowerCase()
    const at = terms.reduce<number>((best, t) => {
      const i = lower.indexOf(t)
      return i >= 0 && (best < 0 || i < best) ? i : best
    }, -1)
    if (at < 0) continue
    // Very long sentences: keep a window around the first mention.
    out.push(s.length > 480 ? `${at > 200 ? '… ' : ''}${s.slice(Math.max(0, at - 200), at + 280)}${at + 280 < s.length ? ' …' : ''}` : s)
    if (out.length >= max) break
  }
  return out
}

export function hostAndPath(url: string): { host: string; rest: string } {
  try {
    const u = new URL(url)
    const rest = `${u.pathname === '/' ? '' : u.pathname}${u.search}`
    return { host: u.hostname.replace(/^www\./, ''), rest }
  } catch {
    return { host: url, rest: '' }
  }
}

/** Why a finding has no AI assessment. Never implies "safe". */
export function notAssessedReason(f: Finding, aiStatus: ScanResult['aiStatus']): string {
  if (!f.pkg.direct) {
    return 'This is a transitive dependency. The AI code check only analyses direct dependencies, because those are the packages your own code imports.'
  }
  if (aiStatus === 'disabled') {
    return 'The AI code check did not run for this scan. It needs source files uploaded with the lockfile and a configured GEMINI_API_KEY on the server.'
  }
  if (aiStatus === 'error') {
    return 'The AI code check failed for this scan, so no finding was assessed. Run the scan again to retry.'
  }
  return 'The AI code check reviews at most 30 direct-dependency findings, in priority order, and only when source files are provided. This finding was outside that limit, or the model returned no usable answer for it.'
}
