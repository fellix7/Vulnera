# Vulnera UI: design system and page contract

Product: an AI-assisted dependency vulnerability **prioritisation and remediation** tool for Node.js projects. Not "another scanner": it narrows a long alert list to what deserves attention, shows the evidence, and gives the minimum safe upgrade.

Signature idea, used everywhere: an **honest funnel**. All vulnerabilities → in production → your code calls the vulnerable API → fix now. Nothing is ever removed; lower-priority findings stay one click away and every ranking shows its reason.

## Truth rules (non-negotiable)

- Vulnerability matching is an exact OSV.dev lookup. EPSS (FIRST.org) and CISA KEV are external data. Tiers come from fixed, published rules (`explainTier` in `lib/selectors.ts` mirrors `server/src/pipeline/score.ts`).
- Gemini only adds context: a verdict per finding (`USES_VULNERABLE_API`, `NO_VULNERABLE_USAGE_FOUND`, `UNCERTAIN`), short reasoning, and code citations. Every citation is re-checked server-side: the quoted text must exist at that file and line (±1) or it is dropped, and a "uses" verdict without a surviving citation becomes `UNCERTAIN`.
- AI only reviews the top direct-dependency findings (up to 30) and only when source files were provided. Everything else is "Not assessed" — say so, never imply "safe".
- AI can only raise a tier. Only a person can lower one (one step, via review). KEV findings can never be lowered.
- Upgrade targets (`plan.to`) are the smallest version that clears every advisory **and was re-checked against OSV** (planner). `to === null` means no verified fix.
- Override snippets for transitive packages are suggestions that need testing.
- Demo data (`source: 'demo'`) is illustrative and must be labelled wherever it shows. It never enters history.
- No invented customers, metrics, integrations, certifications or accuracy claims. Business content is framed as a proposal/hypothesis.
- Advisory text and references are untrusted: render as plain text; only `safeHttpUrl()` links.

## Visual language

Dark-first, near-black graphite, hairline borders, small radii (4/6/10px), dense but calm. One brand accent: **acid lime `--accent`** for primary actions, the logo tip, focus and "current" states only — never for risk.

Semantic colour (always with a label or glyph, never colour alone):
- `--critical` red: critical severity, Fix now, KEV, failures
- `--high` orange: high severity, Fix this sprint
- `--warn` amber: moderate severity, warnings, major upgrades
- `--ok` green: verified data, healthy state, safe target
- `--info` blue: Plan tier, informational
- `--neutral` grey: Monitor tier, ordinary info
- `--ai` violet + **dashed border**: anything AI-generated. Verified data uses solid borders. This provenance distinction is a core trust feature.

Type: Inter Variable (UI), JetBrains Mono Variable (code, ids, versions, numbers in tables, `.eyebrow` labels). Scale tokens `--fs-xs … --fs-display`. Space on a 4px grid (`--s-1 … --s-24`).

Avoid: gradient backgrounds, glow, glassmorphism, floating orbs, giant rounded cards, a card around every datum, decorative fake terminals, meaningless charts, excessive motion. Motion: 120–220ms, `--ease`, respect reduced motion (global rule exists).

## Shared foundation (do not edit unless you own it)

| File | What it gives you |
|---|---|
| `client/src/index.css` | Tokens + primitives: `.btn` (`--primary`, `--ghost`, `--danger`, `--sm`, `--lg`, `--icon`, `[aria-pressed]`), `.panel` / `__head` / `__body`, `.badge` (`--critical/high/warn/ok/info/ai/accent/mono`), `.tier--{TIER}`, `.sev--{SEV}`, `.epss`, `.callout--{info,warn,danger,ok,ai,demo}`, `.code`, `.cmd`, `.input`, `.select`, `.field`, `.check`, `.seg` (segmented control, `aria-pressed`), `.dtable` + `.table-wrap`, `.empty`, `.skeleton`, `.spinner`, `.eyebrow`, `.cluster`, `.stack`, `.muted`, `.subtle`, `.num`, `.mono`, `.truncate`, `.link`, `.link-btn`, `.sr-only`, `.page-head`. Shell: `.shell .sidebar .topbar .content`. |
| `router.tsx` | `Link`, `navigate(to, {replace, keepScroll})`, `useLocation() → {path, search}`, `setSearch(params)` |
| `state/store.tsx` | `useScan()` → `current: ScanRecord \| null` (`source: 'upload'\|'sample'\|'demo'`, `projectName`, `fileName`, `sourceFileCount` (-1 = sample, server-side sources), `result: ScanResult`, `review: ReviewState`), `status`, `error`, `scanningWithAi`, `history`, `sources` (in-memory upload sources or null), `health`, `healthFailed`, `runScan(input)`, `loadDemo()`, `openScan(id)`, `closeScan()`, `deleteScan(id)`, `clearHistory()`, `setReview(key, review)`, `dismissError()`; `SOURCE_LABEL` |
| `lib/selectors.ts` | `findingHref`, `findByKey`, `planFor`, `findingsForPlan`, `aiState`, `AI_STATE_LABEL`, `cveOf`, `isEpssHigh`, `EPSS_THRESHOLD`, `explainTier`, `tierCounts`, `severityCounts`, `aiCounts`, `vulnerablePackages`, `byPriority(review)`, `SEVERITY_ORDER`, `SEVERITY_RANK`, `formatScanTime` |
| `lib/review.ts`, `lib/tiers.ts`, `lib/format.ts`, `lib/funnel.ts`, `lib/report.ts`, `lib/download.ts`, `lib/sources.ts` | Existing logic: review/effective tier, tier labels/blurbs, EPSS format, safe URLs, dependency path, funnel counts, Markdown/JSON report builders, file download/copy, source-folder collection |
| `components/ui/Badges.tsx` | `TierBadge`, `SeverityBadge`, `EpssMeter`, `KevBadge`, `ScopeBadge`, `DepBadge`, `VerdictBadge` (accepts `'NOT_ASSESSED'`), `VERDICT_LONG`, `AiTag`, `VerifiedTag`, `JumpBadge`, `SourceBadge` |
| `components/ui/Kit.tsx` | `CopyButton`, `CommandBlock`, `Callout`, `PageHeader`, `EmptyState`, `NoScan` |
| `components/ui/Icon.tsx`, `Logo.tsx` | `Icon name=…` (see `PATHS` for names), `Logo`, `LogoMark` |
| `components/AppShell.tsx`, `App.tsx` | Sidebar + topbar for app pages; route table |

## Routes

| Path | Page file | Purpose |
|---|---|---|
| `/` | `pages/Landing.tsx` | Public landing page (own nav + footer, no AppShell) |
| `/scan` | `pages/Scan.tsx` | Upload lockfile (+ optional source folder), sample scan, demo, progress, errors |
| `/overview` | `pages/Overview.tsx` | Risk posture dashboard |
| `/findings` | `pages/Findings.tsx` | Explorer. Query params: `tier` (FIX_NOW…), `severity` (CRITICAL…), `scope` (`prod`\|`dev`), `dep` (`direct`\|`transitive`), `ai` (`uses`\|`uncertain`\|`none`\|`unassessed`), `kev` (`1`), `q`, `sort` (`priority`\|`severity`\|`epss`\|`package`) |
| `/finding?key=…` | `pages/FindingDetail.tsx` | One finding; key = `encodeURIComponent(findingKey(f))`, build with `findingHref(f)` |
| `/evidence` | `pages/Evidence.tsx` | Code relevance overview across all AI-assessed findings |
| `/remediation` | `pages/Remediation.tsx` | Fix plan with copyable commands |
| `/reports` | `pages/Reports.tsx` | Export, scan history, compare scans |

Every app page handles `current === null` with `<NoScan what="…" />`, and shows a `<Callout tone="demo">` when `current.source === 'demo'`.
