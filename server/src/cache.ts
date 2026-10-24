import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// External HTTP responses go through here. Lookup order: data/snapshots (committed) → .cache (local) → fetch.
// Lockfile lookups (vulnerability data, exploit scores, registry versions) are NOT read from saved copies:
// every scan fetches them live so results reflect current data. Saved copies are only used in offline mode.
const LIVE_NAMESPACES = new Set(['osv-query', 'osv-vuln', 'epss', 'npm-registry']);
const ROOT = path.resolve(import.meta.dirname, '../..');
const CACHE_DIR = path.join(ROOT, '.cache');
const SNAPSHOT_DIR = path.join(ROOT, 'data', 'snapshots');

export const isOffline = () => process.env.OFFLINE === '1';

export class OfflineMissError extends Error {
  constructor(namespace: string, key: string) {
    super(`Offline mode: no snapshot for ${namespace}/${key}`);
  }
}

function fileFor(dir: string, namespace: string, key: string) {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
  return path.join(dir, namespace, `${hash}.json`);
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export async function cached<T>(namespace: string, key: string, fetcher: () => Promise<T>): Promise<T> {
  const alwaysLive = LIVE_NAMESPACES.has(namespace) && !isOffline();
  if (!alwaysLive) {
    for (const dir of [SNAPSHOT_DIR, CACHE_DIR]) {
      const hit = await readJson<{ key: string; value: T }>(fileFor(dir, namespace, key));
      if (hit) return hit.value;
    }
  }
  if (isOffline()) throw new OfflineMissError(namespace, key);

  const value = await fetcher();
  // Still written, so a live scan can be copied into data/snapshots for offline mode.
  const file = fileFor(CACHE_DIR, namespace, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ key, value }));
  return value;
}
