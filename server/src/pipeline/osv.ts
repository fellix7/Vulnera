import semver from 'semver';
import { cached } from '../cache.js';
import type { Advisory, Severity } from '../types.js';

const OSV = 'https://api.osv.dev/v1';
const BATCH_SIZE = 500;
export const DETAIL_CONCURRENCY = 8;

// ---------- HTTP ----------

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
    }
  }
  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Request to ${url} failed after retry: ${reason}`);
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------- querybatch ----------

interface BatchResult {
  vulns?: { id: string }[];
  next_page_token?: string;
}

interface BatchQuery {
  package: { name: string; ecosystem: 'npm' };
  version: string;
  page_token?: string;
}

const postBatch = (queries: BatchQuery[]) =>
  requestJson<{ results: BatchResult[] }>(`${OSV}/querybatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });

const MISS = Symbol('cache-miss');

/** Vulnerability ids for each input package version (same order as input). */
export async function queryVersions(pkgs: { name: string; version: string }[]): Promise<string[][]> {
  const keyOf = (p: { name: string; version: string }) => `${p.name}@${p.version}`;
  const unique = [...new Map(pkgs.map((p) => [keyOf(p), p])).values()];
  const resolved = new Map<string, string[]>();
  const misses: typeof unique = [];

  // Probe the cache: the fetcher throws a sentinel, so nothing is written on a miss.
  // OfflineMissError (offline + not cached) is not the sentinel and propagates.
  await Promise.all(
    unique.map(async (p) => {
      try {
        resolved.set(
          keyOf(p),
          await cached<string[]>('osv-query', keyOf(p), async () => {
            throw MISS;
          }),
        );
      } catch (err) {
        if (err !== MISS) throw err;
        misses.push(p);
      }
    }),
  );

  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    const chunk = misses.slice(i, i + BATCH_SIZE);
    const { results } = await postBatch(
      chunk.map((p) => ({ package: { name: p.name, ecosystem: 'npm' as const }, version: p.version })),
    );
    if (results.length !== chunk.length) throw new Error('OSV querybatch returned a mismatched number of results');

    for (let j = 0; j < chunk.length; j++) {
      const p = chunk[j]!;
      let res = results[j]!;
      const ids = new Set((res.vulns ?? []).map((v) => v.id));
      while (res.next_page_token) {
        const page = await postBatch([
          { package: { name: p.name, ecosystem: 'npm' }, version: p.version, page_token: res.next_page_token },
        ]);
        res = page.results[0] ?? {};
        for (const v of res.vulns ?? []) ids.add(v.id);
      }
      const list = [...ids].sort();
      resolved.set(keyOf(p), list);
      await cached('osv-query', keyOf(p), async () => list); // still a miss, so this stores it
    }
  }

  return pkgs.map((p) => resolved.get(keyOf(p)) ?? []);
}

// ---------- CVSS v3.x ----------

const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 } as const;
const AC = { L: 0.77, H: 0.44 } as const;
const UI = { N: 0.85, R: 0.62 } as const;
const CIA = { H: 0.56, L: 0.22, N: 0 } as const;

// CVSS 3.1 Roundup: smallest number with one decimal place that is >= the input, safe against float error.
function roundUp(x: number): number {
  const int = Math.round(x * 100000);
  return int % 10000 === 0 ? int / 100000 : (Math.floor(int / 10000) + 1) / 10;
}

/** CVSS v3.0/v3.1 base score from a vector string, or null if it is not a valid v3 vector. */
export function cvss3BaseScore(vector: string): number | null {
  if (!/^CVSS:3\.[01]\//.test(vector)) return null;
  const m: Record<string, string> = {};
  for (const part of vector.split('/').slice(1)) {
    const [k, v] = part.split(':');
    if (k && v) m[k] = v;
  }
  const av = AV[m.AV as keyof typeof AV];
  const ac = AC[m.AC as keyof typeof AC];
  const ui = UI[m.UI as keyof typeof UI];
  const c = CIA[m.C as keyof typeof CIA];
  const i = CIA[m.I as keyof typeof CIA];
  const a = CIA[m.A as keyof typeof CIA];
  if ([av, ac, ui, c, i, a].some((x) => x === undefined)) return null;
  if (m.S !== 'U' && m.S !== 'C') return null;
  const changed = m.S === 'C';
  const pr = ({ N: 0.85, L: changed ? 0.68 : 0.62, H: changed ? 0.5 : 0.27 } as Record<string, number>)[m.PR ?? ''];
  if (pr === undefined) return null;

  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 : 6.42 * iss;
  if (impact <= 0) return 0;
  const exploitability = 8.22 * av * ac * pr * ui;
  return changed
    ? roundUp(Math.min(1.08 * (impact + exploitability), 10))
    : roundUp(Math.min(impact + exploitability, 10));
}

export function severityFromScore(score: number): Severity {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  if (score > 0) return 'LOW';
  return 'UNKNOWN';
}

// ---------- advisory mapping ----------

interface OsvVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  withdrawn?: string;
  severity?: { type: string; score: string }[];
  database_specific?: { severity?: string };
  references?: { url?: string }[];
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { type?: string; events?: { fixed?: string }[] }[];
  }[];
}

function severityOf(v: OsvVuln): Severity {
  const label = v.database_specific?.severity?.toUpperCase();
  if (label === 'MEDIUM') return 'MODERATE';
  if (label === 'CRITICAL' || label === 'HIGH' || label === 'MODERATE' || label === 'LOW') return label;
  for (const s of v.severity ?? []) {
    const score = cvss3BaseScore(s.score);
    if (score !== null) return severityFromScore(score);
  }
  return 'UNKNOWN';
}

function fixedVersionsOf(v: OsvVuln, pkgName: string): string[] {
  const fixed = new Set<string>();
  for (const aff of v.affected ?? []) {
    if (aff.package?.ecosystem !== 'npm' || aff.package.name !== pkgName) continue;
    for (const range of aff.ranges ?? []) {
      if (range.type === 'GIT') continue; // commit hashes, not versions
      for (const ev of range.events ?? []) {
        const clean = ev.fixed ? semver.valid(ev.fixed) : null;
        if (clean) fixed.add(clean);
      }
    }
  }
  return [...fixed].sort(semver.compare);
}

/** Like getAdvisory but returns null for withdrawn advisories (used when bulk matching). */
export async function getAdvisoryOrNull(id: string, pkgName: string): Promise<Advisory | null> {
  const v = await cached<OsvVuln>('osv-vuln', id, () => requestJson<OsvVuln>(`${OSV}/vulns/${encodeURIComponent(id)}`));
  if (v.withdrawn) return null;
  return {
    id: v.id,
    aliases: v.aliases ?? [],
    summary: v.summary ?? '',
    details: v.details ?? '',
    severity: severityOf(v),
    fixedVersions: fixedVersionsOf(v, pkgName),
    references: (v.references ?? []).map((r) => r.url).filter((u): u is string => !!u),
  };
}

/** Advisory for an OSV id; fixedVersions are scoped to pkgName. Throws if the advisory was withdrawn. */
export async function getAdvisory(id: string, pkgName: string): Promise<Advisory> {
  const adv = await getAdvisoryOrNull(id, pkgName);
  if (!adv) throw new Error(`Advisory ${id} has been withdrawn`);
  return adv;
}
