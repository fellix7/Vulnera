import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { cached, isOffline } from '../cache.js';
import type { Advisory, Enrichment } from '../types.js';

// Adds EPSS (exploit probability, FIRST) and KEV (exploited in the wild, CISA) to advisories.
// Missing data is always null ("no data"), never 0 / false-by-default.

const ROOT = path.resolve(import.meta.dirname, '../../..');
const KEV_FILE = path.join(ROOT, 'data', 'kev.json');
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const EPSS_URL = 'https://api.first.org/data/v1/epss';
const EPSS_BATCH = 50;
const FETCH_TIMEOUT_MS = 15_000;

export interface EnrichResult {
  /** keyed by advisory.id */
  map: Map<string, Enrichment>;
  /** non-fatal problems (EPSS unreachable, KEV missing); append to ScanResult.notes */
  warnings: string[];
}

let kevPromise: Promise<Set<string>> | undefined;

export function loadKev(): Promise<Set<string>> {
  kevPromise ??= readKev().catch((err) => {
    kevPromise = undefined; // allow retry on next call
    throw err;
  });
  return kevPromise;
}

async function readKev(): Promise<Set<string>> {
  let text: string;
  try {
    text = await readFile(KEV_FILE, 'utf8');
  } catch {
    if (isOffline()) throw new Error('data/kev.json is missing and OFFLINE=1');
    const res = await fetch(KEV_URL, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`KEV download failed: HTTP ${res.status}`);
    text = await res.text();
    await mkdir(path.dirname(KEV_FILE), { recursive: true });
    await writeFile(KEV_FILE, text);
  }
  const json = JSON.parse(text) as { vulnerabilities?: { cveID: string }[] };
  return new Set((json.vulnerabilities ?? []).map((v) => v.cveID.toUpperCase()));
}

export function cveIdsOf(advisory: Pick<Advisory, 'id' | 'aliases'>): string[] {
  const ids = new Set<string>();
  for (const id of [advisory.id, ...advisory.aliases]) {
    if (/^CVE-/i.test(id)) ids.add(id.toUpperCase());
  }
  return [...ids];
}

interface EpssResponse {
  data?: { cve: string; epss: string }[];
}

async function fetchEpssBatch(cves: string[]): Promise<Map<string, number>> {
  const res = await fetch(`${EPSS_URL}?cve=${cves.join(',')}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`EPSS HTTP ${res.status}`);
  const body = (await res.json()) as EpssResponse;
  const out = new Map<string, number>();
  for (const row of body.data ?? []) {
    const p = Number(row.epss);
    if (Number.isFinite(p)) out.set(row.cve.toUpperCase(), p);
  }
  return out;
}

// EPSS per CVE, cached per CVE (a CVE FIRST doesn't know is cached as null). A batch of up to
// EPSS_BATCH CVEs is fetched in one request, and only if at least one of its CVEs misses the cache.
async function lookupEpss(cves: string[], warnings: string[]): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  let failed = 0;
  let firstError = '';

  const tasks: Promise<void>[] = [];
  for (let i = 0; i < cves.length; i += EPSS_BATCH) {
    const chunk = cves.slice(i, i + EPSS_BATCH);
    let batch: Promise<Map<string, number>> | undefined;
    const getBatch = () => (batch ??= fetchEpssBatch(chunk));
    for (const cve of chunk) {
      tasks.push(
        cached<number | null>('epss', cve, async () => (await getBatch()).get(cve) ?? null).then(
          (v) => void result.set(cve, v),
          (err: unknown) => {
            failed++;
            firstError ||= err instanceof Error ? err.message : String(err);
            result.set(cve, null);
          },
        ),
      );
    }
  }
  await Promise.all(tasks);
  if (failed) warnings.push(`EPSS unavailable for ${failed} CVE(s) (${firstError}); shown as "no data"`);
  return result;
}

/** Never throws for network problems; they become `warnings` and null ("no data") values. */
export async function enrich(advisories: Advisory[]): Promise<EnrichResult> {
  const warnings: string[] = [];
  const map = new Map<string, Enrichment>();

  let kev: Set<string> | null = null;
  try {
    kev = await loadKev();
  } catch (err) {
    warnings.push(`CISA KEV list unavailable (${err instanceof Error ? err.message : String(err)}); KEV shown as "no data"`);
  }

  const cvesByAdvisory = new Map<string, string[]>(advisories.map((a) => [a.id, cveIdsOf(a)]));
  const allCves = [...new Set([...cvesByAdvisory.values()].flat())];
  const epss = allCves.length ? await lookupEpss(allCves, warnings) : new Map<string, number | null>();

  for (const a of advisories) {
    const cves = cvesByAdvisory.get(a.id) ?? [];
    if (cves.length === 0) {
      map.set(a.id, { epss: null, kev: null });
      continue;
    }
    const scores = cves.map((c) => epss.get(c)).filter((v): v is number => typeof v === 'number');
    map.set(a.id, {
      epss: scores.length ? Math.max(...scores) : null,
      kev: kev ? cves.some((c) => kev.has(c)) : null,
    });
  }
  return { map, warnings };
}
