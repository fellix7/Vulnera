# QuickNotes: expected Vulnera results

Planted cases for the live demo. Advisory IDs were verified against the OSV API (`/v1/query` and `/v1/querybatch`) on 2026-10-24. OSV data keeps growing, so counts may drift upward by a few.

## Lockfile totals

| Measure | Value |
|---|---|
| Lockfile version | 3 (generated with `npm install --package-lock-only --ignore-scripts`) |
| Direct dependencies | 10 (8 runtime, 2 dev) |
| Lockfile entries (`packages` minus root) | 269 |
| Unique `name@version` pairs | 251 |
| Transitive entries | 259 |
| Vulnerable `name@version` pairs | 21 |
| **Total OSV advisories (all packages, direct + transitive)** | **76** (76 unique ids) |

OSV-Scanner 2.7.0 returns the same result (251 packages, 21 vulnerable, 76 advisories): see `samples/expected/osv-scanner.json`.

Advisories per vulnerable package:

| Package@version | Direct? | Scope | Advisories |
|---|---|---|---|
| axios@0.21.0 | direct | prod | 25 |
| lodash@4.17.15 | direct | prod | 6 |
| jsonwebtoken@8.5.1 | direct | prod | 3 |
| ejs@3.1.6 | direct | prod | 2 |
| express@4.17.1 | direct | prod | 2 |
| marked@0.7.0 | direct | prod | 2 |
| node-fetch@2.6.0 | direct | prod | 2 |
| minimist@1.2.5 | direct | prod | 1 |
| qs@6.7.0 (express > qs; also via body-parser) | transitive | prod | 4 |
| body-parser@1.19.0 (express > body-parser) | transitive | prod | 3 |
| path-to-regexp@0.1.7 (express > path-to-regexp) | transitive | prod | 3 |
| cookie@0.4.0 (express > cookie) | transitive | prod | 1 |
| send@0.17.1 (express > send) | transitive | prod | 1 |
| serve-static@1.14.1 (express > serve-static) | transitive | prod | 1 |
| nanoid@3.1.12 (mocha > nanoid) | transitive | dev | 5 |
| js-yaml@3.14.0 (mocha > js-yaml) | transitive | dev | 5 |
| minimatch@3.0.4 (mocha > minimatch) | transitive | dev | 4 |
| serialize-javascript@5.0.1 (mocha > serialize-javascript) | transitive | dev | 3 |
| debug@4.2.0 (mocha > debug) | transitive | dev | 1 |
| diff@4.0.2 (mocha > diff) | transitive | dev | 1 |
| got@9.6.0 (nodemon > update-notifier > latest-version > package-json > got) | transitive | dev | 1 |

mocha@8.2.0 and nodemon@2.0.4 themselves have no advisories; only their transitive dependencies do (all "Monitor" tier because they are dev-only).

## Planted cases (direct runtime dependencies)

AI verdicts apply to the advisories that name the function listed. The AI check only runs on direct dependencies, so transitive packages and dev packages get no verdict.

| Package@version | Advisories (GHSA / CVE) | Location | Expected AI verdict |
|---|---|---|---|
| lodash@4.17.15 | GHSA-35jh-r3h4-6jhm / CVE-2021-23337 (command injection in `template`); GHSA-r5fr-rjxr-66jc / CVE-2026-4800 (code injection via `_.template` imports key names) | `src/routes/render.js:12` `_.template(req.body.template)`, user-controlled template string | USES_VULNERABLE_API |
| lodash@4.17.15 | GHSA-p6mc-m468-83gw / CVE-2020-8203 (prototype pollution `zipObjectDeep`); GHSA-xxjr-mmjv-4gpg / CVE-2025-13465 and GHSA-f23m-r3pf-42rh / CVE-2026-2950 (`_.unset`, `_.omit`); GHSA-29mw-wpgm-hmr9 / CVE-2020-28500 (ReDoS `toNumber`, `trim`, `trimEnd`) | Only `_.chunk` (`src/utils/list.js:5`) and `_.template` are called | NO_VULNERABLE_USAGE_FOUND |
| axios@0.21.0 | GHSA-jr5f-v2jv-69x6 / CVE-2025-27152 (SSRF and credential leak via absolute URL); GHSA-4w2v-q235-vp99 / CVE-2020-28168 (SSRF via redirect) | `src/routes/preview.js:10` `axios.get(req.query.url, ...)`, fully user-controlled URL | USES_VULNERABLE_API |
| axios@0.21.0 | Remaining 23 (prototype-pollution gadgets, `NO_PROXY` bypasses, `maxBodyLength`/`maxContentLength` bypasses, ReDoS, CSRF CVE-2023-45857, etc.; mostly CVE-2026-xxxxx) | Only a plain `axios.get` with `timeout` is called; no proxy, `maxBodyLength`, or form-data options | Mostly NO_VULNERABLE_USAGE_FOUND or UNCERTAIN (the model may flag the user-controlled URL for the proxy bypasses) |
| jsonwebtoken@8.5.1 | GHSA-qwph-4952-7xr6 / CVE-2022-23540 (signature validation bypass: insecure default algorithm) | `src/middleware/auth.js:11` `jwt.verify(token, SECRET)` with no `algorithms` option | USES_VULNERABLE_API |
| jsonwebtoken@8.5.1 | GHSA-8cf7-32gw-wr33 / CVE-2022-23539 (unrestricted key type); GHSA-hjrf-2m68-5959 / CVE-2022-23541 (insecure key retrieval function) | Static string secret, no key-retrieval function. `jwt.sign` at `src/routes/auth.js:12` pins `HS256` | NO_VULNERABLE_USAGE_FOUND |
| ejs@3.1.6 | GHSA-phwq-j96m-2c2q / CVE-2022-29078 (template injection via `settings[view options][outputFunctionName]`); GHSA-ghr5-ch3p-vcr6 / CVE-2024-33883 (pollution protection) | `src/routes/render.js:18` `res.render('settings', { ...req.query, user: req.user })`, query string spread into render options | USES_VULNERABLE_API |
| express@4.17.1 | GHSA-qw6h-vgh9-j6wx / CVE-2024-43796 (XSS in `response.redirect()`); GHSA-rv95-896h-c2vc / CVE-2024-29041 (open redirect, malformed URLs) | Every `res.redirect` takes a hard-coded path (`src/server.js:28`, `src/routes/notes.js:22`) | NO_VULNERABLE_USAGE_FOUND |
| marked@0.7.0 | GHSA-5v2h-r2cx-5xgj / CVE-2022-21681 and GHSA-rrrm-qjm4-v8hf / CVE-2022-21680 (ReDoS) | `src/routes/docs.js:8` renders the repo's own `src/help.md` once at startup: trusted static content | NO_VULNERABLE_USAGE_FOUND (safe usage) |
| minimist@1.2.5 | GHSA-xvch-5gv4-984h / CVE-2021-44906 (prototype pollution) | `src/server.js:13` parses `process.argv` supplied by whoever starts the server, not by remote users | NO_VULNERABLE_USAGE_FOUND (safe usage) |
| node-fetch@2.6.0 | GHSA-r683-j2x4-v87g / CVE-2022-0235 (forwards secure headers to untrusted sites); GHSA-w7rc-rwvf-8q5r / CVE-2020-15168 (`size` ignored after redirect) | Listed in `package.json` but **not imported anywhere** | NO_VULNERABLE_USAGE_FOUND (not imported) |

Summary of the three outcome groups the demo should show:

- Confirmed vulnerable usage (4 packages): lodash `template`, axios `get` with a user URL, jsonwebtoken `verify` without `algorithms`, ejs `render` with query-string options.
- Imported but safe (4 packages): express (static redirects), marked (trusted static content), minimist (CLI args), and the non-template lodash advisories.
- Declared but never imported (1 package): node-fetch.

## Transitive advisories (no AI verdict)

Fix path for the prod ones is "upgrade express" (pulls fixed `qs`, `body-parser`, `path-to-regexp`, `cookie`, `send`, `serve-static`). The dev ones sit under `mocha` and `nodemon`, so they land in the Monitor tier.

## How this was produced

- OSV: `POST https://api.osv.dev/v1/querybatch` with every `name@version` in the lockfile (269 queries, no pagination tokens returned).
- Baseline: `osv-scanner scan source --lockfile samples/demo-app/package-lock.json --format json` (OSV-Scanner 2.7.0, installed with Homebrew).
- Never run `npm install` in this folder; the lockfile was created with `npm install --package-lock-only --ignore-scripts`.
