import type { SourceFile } from '../types'

export const MAX_FILES = 300
export const MAX_BYTES = 3 * 1024 * 1024
const SOURCE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs)$/i
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git'])

export interface CollectedSources {
  folderName: string
  sources: SourceFile[]
  totalBytes: number
  skipped: {
    excludedDir: number
    nonSource: number
    overFileCap: number
    overSizeCap: number
    unreadable: number
  }
}

/** Filter a folder picked via <input webkitdirectory> down to source files and read them. */
export async function collectSources(files: FileList | File[]): Promise<CollectedSources> {
  const list = Array.from(files).map((file) => ({
    file,
    rel: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))
  list.sort((a, b) => a.rel.localeCompare(b.rel))

  const skipped = { excludedDir: 0, nonSource: 0, overFileCap: 0, overSizeCap: 0, unreadable: 0 }
  const folderName = list[0]?.rel.includes('/') ? list[0].rel.split('/')[0] : ''
  const chosen: { file: File; path: string }[] = []
  let bytes = 0

  for (const { file, rel } of list) {
    const parts = rel.split('/')
    const path = parts.length > 1 ? parts.slice(1).join('/') : rel // strip the top folder name
    const dirs = path.split('/').slice(0, -1)
    if (dirs.some((d) => SKIP_DIRS.has(d))) {
      skipped.excludedDir++
    } else if (!SOURCE_EXT.test(path)) {
      skipped.nonSource++
    } else if (chosen.length >= MAX_FILES) {
      skipped.overFileCap++
    } else if (bytes + file.size > MAX_BYTES) {
      skipped.overSizeCap++
    } else {
      bytes += file.size
      chosen.push({ file, path })
    }
  }

  const slots: (SourceFile | null)[] = chosen.map(() => null)
  let totalBytes = 0
  await Promise.all(
    chosen.map(async ({ file, path }, i) => {
      try {
        slots[i] = { path, content: await file.text() }
        totalBytes += file.size
      } catch {
        skipped.unreadable++
      }
    }),
  )
  return {
    folderName,
    sources: slots.filter((s): s is SourceFile => s !== null),
    totalBytes,
    skipped,
  }
}
