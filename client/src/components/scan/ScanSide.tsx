import type { ReactNode } from 'react'
import { formatBytes } from '../../lib/format'
import { MAX_BYTES, MAX_FILES } from '../../lib/sources'
import { CommandBlock } from '../ui/Kit'
import { Icon, type IconName } from '../ui/Icon'

function Point({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <li className="scan-point">
      <span className="scan-point__icon" aria-hidden="true">
        <Icon name={icon} size={14} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  )
}

/** Side column on /scan: what happens to the user's files, and what can be scanned. */
export function ScanSide() {
  return (
    <>
      <section className="scan-aside" aria-labelledby="scan-privacy-h">
        <h2 id="scan-privacy-h">What happens to your files</h2>
        <ul className="scan-points">
          <Point icon="eye" title="Read only">
            Your project is never installed, built or run. Vulnera only reads the lockfile and, if you choose a folder, the text of your source files.
          </Point>
          <Point icon="upload" title="The lockfile goes to this server">
            Package names and versions are looked up at OSV.dev, FIRST.org (EPSS), CISA (KEV) and the npm registry. The file itself is not sent to those services.
          </Point>
          <Point icon="sparkle" title="Gemini sees snippets, only if you add a folder">
            Source files go to this server, which keeps only the files that import a vulnerable package and sends short code snippets around those uses to Gemini. Obvious
            secrets such as API keys and tokens are masked first (best effort).
          </Point>
          <Point icon="database" title="History stays in this browser">
            Finished scans are saved in this browser&rsquo;s local storage. Source files are kept in memory only and are gone when you close the tab.
          </Point>
        </ul>
      </section>

      <section className="scan-aside" aria-labelledby="scan-formats-h">
        <h2 id="scan-formats-h">Supported formats</h2>
        <dl className="scan-formats">
          <div>
            <dt>Lockfile</dt>
            <dd>
              npm <code>package-lock.json</code> (also <code>npm-shrinkwrap.json</code>) with lockfileVersion 2 or 3, written by npm 7+. Up to 10 MB.
            </dd>
          </div>
          <div>
            <dt>Not supported</dt>
            <dd>
              lockfileVersion 1 (npm 6 or older) is rejected by the server. <code>yarn.lock</code> and <code>pnpm-lock.yaml</code> are not read.
            </dd>
          </div>
          <div>
            <dt>Source files</dt>
            <dd>
              <code>.js</code> <code>.jsx</code> <code>.ts</code> <code>.tsx</code> <code>.mjs</code> <code>.cjs</code>. Up to {MAX_FILES} files and {formatBytes(MAX_BYTES)}; folders
              named node_modules, dist, build and .git are skipped.
            </dd>
          </div>
        </dl>
        <p className="scan-aside__sub">Have an old lockfile? Regenerate it without installing anything:</p>
        <CommandBlock command="npm install --package-lock-only" />
      </section>
    </>
  )
}
