# Test lockfiles

Real `package-lock.json` files for testing Vulnera without a project. Each was generated with
`npm install --package-lock-only --ignore-scripts`, so no package was ever installed or run.
Upload any of them in the dashboard (no source folder needed).

Expected results were checked against Google's OSV-Scanner: Vulnera finds exactly the same
advisories (none missing, none extra) for every valid lockfile below.

| Folder | What it tests | Packages | Findings | Plans (no fix) | Tiers |
|---|---|---|---|---|---|
| `01-express-legacy` | Old Express stack, transitive packages | 92 | 26 | 11 (1) | 2 now · 13 sprint · 11 plan |
| `02-react-frontend-old` | Old React app, small tree | 17 | 46 | 6 (0) | 3 now · 20 sprint · 23 plan |
| `03-dev-only-issues` | Only dev tools are vulnerable, large tree | 885 | 61 | 25 (4) | all 61 in Monitor |
| `04-transitive-heavy` | Deep dependency chains | 109 | 50 | 17 (2) | 1 now · 29 sprint · 20 plan |
| `05-modern-clean` | Up-to-date packages, expects no findings | 67 | 0 | 0 | none |
| `06-scoped-and-aliases` | `@scoped` names and an npm alias (`lodash-old` → `lodash`) | 49 | 12 | 5 (0) | 1 now · 5 sprint · 6 plan |
| `07-monorepo-workspaces` | npm workspaces (links between packages) | 5 | 30 | 4 (0) | 15 sprint · 15 plan |

`invalid/` holds files that should fail cleanly or be handled gracefully:

| File | Expected |
|---|---|
| `90-lockfile-v1.json` | Error asking for npm 7+ lockfile |
| `91-truncated-json.json` | Rejected in the dashboard: not valid JSON |
| `92-no-dependencies.json` | Scans fine: 0 packages, 0 findings |
| `93-top-level-array.json` | Error: top level must be an object |
| `94-no-lockfile-version.json` | Accepted (lenient): 1 package scanned |
| `95-empty-file.json` | Rejected in the dashboard: not valid JSON |

Counts reflect OSV data on 24 Oct 2026; OSV keeps growing, so findings may drift upward.

## Regenerate one

```bash
cd samples/lockfiles/01-express-legacy && npm install --package-lock-only --ignore-scripts
```
Never run a plain `npm install` in these folders.
