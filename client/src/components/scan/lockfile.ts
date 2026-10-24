// Client-side lockfile checks. The server stays the authority (server/src/pipeline/parse.ts), but these
// catch the common mistakes before a request is made.
import { formatBytes } from '../../lib/format'

/** Matches express.json({ limit: '10mb' }) in server/src/index.ts. */
export const MAX_REQUEST_BYTES = 10 * 1024 * 1024

const EXPECTED_NAMES = new Set(['package-lock.json', 'npm-shrinkwrap.json'])

export interface LockfileInfo {
  fileName: string
  size: number
  lockfile: unknown
  /** `lockfileVersion` when present and numeric. */
  version: number | null
  /** Root `name`, from the top-level field or the root `packages[""]` entry. */
  projectName: string | null
  /** Installed entries: `packages` minus the root, else the top-level `dependencies` keys. */
  entries: number
  entriesFrom: 'packages' | 'dependencies'
  /** The file name is not one npm writes. Scanned anyway. */
  unusualName: boolean
  /** No `packages` map (lockfileVersion 1): the server parser rejects these. */
  legacyFormat: boolean
}

export type LockfileResult = { ok: true; info: LockfileInfo } | { ok: false; fileName: string; error: string }

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Same checks as the original scan panel (valid JSON, top-level object, `packages` or `dependencies`) plus a size cap. */
export async function readLockfile(file: File): Promise<LockfileResult> {
  const fileName = file.name
  if (file.size > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      fileName,
      error: `This file is ${formatBytes(file.size)}. The server accepts requests up to 10 MB, so it cannot be scanned. A package-lock.json is normally well under that; check that you picked the right file.`,
    }
  }
  if (file.size === 0) return { ok: false, fileName, error: 'This file is empty.' }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, fileName, error: 'The browser could not read that file. If you dropped a folder, pick the package-lock.json inside it instead.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    const detail = err instanceof SyntaxError ? ` (${err.message})` : ''
    return { ok: false, fileName, error: `That file is not valid JSON${detail}. A package-lock.json is a JSON file written by npm.` }
  }
  if (!isObj(parsed)) {
    return { ok: false, fileName, error: 'The top level of the file is not a JSON object, so it is not a package-lock.json.' }
  }
  const hasPackages = 'packages' in parsed
  const hasDeps = 'dependencies' in parsed
  if (!hasPackages && !hasDeps) {
    return {
      ok: false,
      fileName,
      error: 'This does not look like a package-lock.json: it has no "packages" or "dependencies" field.',
    }
  }

  const packages = isObj(parsed.packages) ? parsed.packages : null
  const deps = isObj(parsed.dependencies) ? parsed.dependencies : null
  const root = packages && isObj(packages['']) ? packages[''] : null
  const nameField = typeof parsed.name === 'string' && parsed.name ? parsed.name : null
  const rootName = root && typeof root.name === 'string' && root.name ? root.name : null

  const entriesFrom = packages ? 'packages' : 'dependencies'
  const entries = packages ? Object.keys(packages).filter((k) => k !== '').length : deps ? Object.keys(deps).length : 0

  return {
    ok: true,
    info: {
      fileName,
      size: file.size,
      lockfile: parsed,
      version: typeof parsed.lockfileVersion === 'number' ? parsed.lockfileVersion : null,
      projectName: nameField ?? rootName,
      entries,
      entriesFrom,
      unusualName: !EXPECTED_NAMES.has(fileName.toLowerCase()),
      legacyFormat: !packages,
    },
  }
}

/** File name without its extension, as a last-resort project name. */
export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, '') || fileName
}

/** Pick the most likely lockfile from files dropped onto the page. */
export function pickDroppedFile(files: FileList | File[]): File | null {
  const list = Array.from(files)
  return list.find((f) => EXPECTED_NAMES.has(f.name.toLowerCase())) ?? list[0] ?? null
}
