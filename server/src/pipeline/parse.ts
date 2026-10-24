import type { Package } from '../types.js';

const NM = 'node_modules/';
const REGEN_HINT =
  'Regenerate the lockfile with npm 7 or newer, e.g. `npm install --package-lock-only`, and upload the new package-lock.json.';

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Dependency names declared by an entry in the given fields. Ignores fields of the wrong shape. */
function depNames(entry: Obj, fields: readonly string[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    const v = entry[f];
    if (isObj(v)) out.push(...Object.keys(v));
  }
  return out;
}

/** Package name from a lockfile key: the segment after the LAST `node_modules/`. null for keys that are not installed packages (workspace sources). */
function nameFromKey(key: string): string | null {
  const i = key.lastIndexOf(NM);
  if (i === -1) return null;
  if (i > 0 && key[i - 1] !== '/') return null;
  const name = key.slice(i + NM.length);
  return name.length > 0 ? name : null;
}

/** Location enclosing `loc` in Node's resolution walk (strip the last node_modules/<name>). */
function parentLocation(loc: string): string {
  const i = loc.lastIndexOf(NM);
  if (i <= 0) return '';
  return loc.slice(0, i - 1);
}

interface Acc {
  name: string;
  version: string;
  direct: boolean;
  dev: boolean;
  path: string[];
}

/**
 * Parse an npm lockfile (v2/v3) into a flat, de-duplicated package inventory.
 * Throws an Error with a user-facing message on unsupported or malformed input.
 */
export function parseLockfile(lock: unknown): Package[] {
  if (!isObj(lock)) {
    throw new Error('Invalid package-lock.json: expected a JSON object at the top level.');
  }
  if (lock.lockfileVersion === 1) {
    throw new Error(`Unsupported lockfile: lockfileVersion 1 (npm 6 or older) has no "packages" map. ${REGEN_HINT}`);
  }
  const packages = lock.packages;
  if (packages === undefined || packages === null) {
    throw new Error(
      `Unsupported lockfile: no "packages" map found (lockfileVersion 1, or not an npm lockfile). ${REGEN_HINT}`,
    );
  }
  if (!isObj(packages)) {
    throw new Error('Invalid package-lock.json: "packages" must be an object.');
  }

  const entries = new Map<string, Obj>();
  for (const [key, val] of Object.entries(packages)) {
    if (isObj(val)) entries.set(key, val);
  }
  if (entries.size === 0) {
    throw new Error('Invalid package-lock.json: "packages" map is empty. Is this a complete npm lockfile?');
  }

  // Names declared by the root project (and by workspace members, whose deps are hoisted to the top level too).
  const declFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;
  const rootNames = new Set<string>();
  const root = entries.get('');
  if (root) for (const n of depNames(root, declFields)) rootNames.add(n);
  for (const [key, e] of entries) {
    if (key !== '' && e.link !== true && nameFromKey(key) === null) {
      for (const n of depNames(e, declFields)) rootNames.add(n);
    }
  }

  const edgeFields = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const;
  const resolve = (from: string, dep: string): string | null => {
    let loc = from;
    for (;;) {
      const cand = loc === '' ? NM + dep : `${loc}/${NM}${dep}`;
      const e = entries.get(cand);
      if (e && e.link !== true) return cand;
      if (loc === '') return null;
      loc = parentLocation(loc);
    }
  };

  // BFS from all direct deps over installed locations; first visit = shortest chain.
  const pathOf = new Map<string, string[]>();
  const queue: string[] = [];
  for (const n of rootNames) {
    const loc = NM + n;
    const e = entries.get(loc);
    if (e && e.link !== true && !pathOf.has(loc)) {
      pathOf.set(loc, [n]);
      queue.push(loc);
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const loc = queue[qi]!;
    const p = pathOf.get(loc)!;
    for (const dep of depNames(entries.get(loc)!, edgeFields)) {
      const target = resolve(loc, dep);
      if (target && !pathOf.has(target)) {
        pathOf.set(target, [...p, nameFromKey(target) ?? dep]);
        queue.push(target);
      }
    }
  }

  const acc = new Map<string, Acc>();
  for (const [key, e] of entries) {
    if (key === '' || e.link === true) continue;
    const name = nameFromKey(key);
    if (name === null) continue;
    if (typeof e.version !== 'string' || e.version === '') continue;

    const isDirect = key === NM + name && rootNames.has(name);
    const dev = e.dev === true;
    const path = pathOf.get(key) ?? [name];
    const id = `${name}@${e.version}`;
    const cur = acc.get(id);
    if (!cur) {
      acc.set(id, { name, version: e.version, direct: isDirect, dev, path });
    } else {
      cur.direct = cur.direct || isDirect;
      cur.dev = cur.dev && dev;
      if (path.length < cur.path.length) cur.path = path;
    }
  }

  return [...acc.values()].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : a.version > b.version ? 1 : 0,
  );
}
