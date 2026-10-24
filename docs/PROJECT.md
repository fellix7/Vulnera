# Vulnera: project overview

Vulnera tells developers which vulnerable dependencies to fix first, and why. It was built for the Tech Yuva × Google Developer Groups Gurugram Build-a-thon 2026 (24 October 2026), problem statement **PS-09: Software Dependency Vulnerability Checker**.

## 1. What we are solving

### The brief
> Read a sample dependency file, match package versions against a vulnerability dataset and generate a prioritized list of findings with upgrade guidance.

### The real problem underneath
Finding known-vulnerable packages is already solved: `npm audit`, Dependabot and Google's OSV-Scanner all do it. What developers lack is **triage**:
- A typical project gets dozens of alerts at once, with no sense of which matter.
- Most alerts are in packages the developer never chose: pulled in by other packages ("transitive"), or only used during development.
- Advisories are written for security specialists.
- Developers fear upgrades will break the app, so they postpone them.
- For a transitive package, it is unclear which of their own dependencies to upgrade.

So the problem Vulnera solves is:

> Turn a raw list of vulnerable dependencies into a short fix order, backed by evidence, with the exact version to move to.

### Who it is for
- **Primary:** developers in small teams with no security staff: students, startups, people building quickly with AI tools.
- **Secondary:** security reviewers and tech leads, who need evidence to justify a fix and a report they can share.

### Out of scope
Vulnerabilities nobody has published yet, malware detection, and running or exploiting anything. Only npm (`package-lock.json`) is supported.

## 2. What we are aiming at

**The goal:** a working end-to-end product that, in a live demo, takes a real project's lockfile and in under a minute produces a short, ranked, explained fix list.

**The differentiator** is the "funnel": instead of "76 vulnerabilities", Vulnera narrows what needs action:

> 76 known vulnerabilities → 56 in production code → N where *your code* calls the vulnerable function → fix these first

The third stage answers the question every developer asks about `npm audit`: *does this actually affect me?* It is the one step conventional tools cannot do, and where AI is used.

**Principles**
- **Facts come from data, not AI.** Whether a package is vulnerable is an exact lookup against OSV.dev. AI never creates or removes a finding.
- **Every claim can be checked.** Every ranking has stated reasons. Every AI code citation is machine-verified against the real file.
- **Humans stay in charge.** AI may raise a priority; only a person can lower it. Findings on CISA's known-exploited list can never be lowered.
- **Safe to point at your code.** Uploaded projects are only read, never installed or run. Only small snippets reach Gemini, with secrets masked.

## 3. What we are building

A web app: upload a `package-lock.json` (optionally with your source folder), or scan the built-in sample project.

**Output**
1. **Funnel summary** (above).
2. **Findings grouped into four tiers**, each with reason tags such as `EPSS 21%`, `Severity: High`, `Production dependency`, `Via express`, and, when the AI ran, `Your code calls template (src/routes/render.js:12)`:
   - **Fix now:** on the CISA Known Exploited list; or High/Critical in production code with a high exploitation probability (EPSS ≥ 10%) or confirmed use by your code.
   - **Fix this sprint:** other High/Critical production findings; Medium with EPSS ≥ 10%.
   - **Plan:** other production findings.
   - **Monitor:** development-only packages (kept visible, because build tools can be attacked too).
3. **Detail panel** per finding: why it has this priority, the advisory (shown as plain text, since it is untrusted), the dependency path, exploit data, fixed versions, the AI verdict with cited code, and the upgrade plan.
4. **Upgrade plan** per package: the smallest version that fixes every known vulnerability, re-checked against OSV so the upgrade doesn't land on another vulnerable version; whether the jump is patch, minor or major; and the exact command. For a transitive package it names the direct dependency to upgrade, or gives an npm `overrides` hint.
5. **Human review:** confirm or dispute the AI verdict; lower a finding's priority (not for known-exploited ones).
6. **Reports:** JSON and Markdown download.

## 4. How we are building it

### Data sources
| Source | Used for | Notes |
|---|---|---|
| [OSV.dev](https://osv.dev) | Matching package versions to advisories; severity; fixed versions | Run by Google, free, no key |
| [FIRST EPSS](https://www.first.org/epss/) | Probability a vulnerability is exploited in the next 30 days | Missing data is shown as "no data", never as zero |
| [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) | Vulnerabilities known to be exploited in real attacks | Saved in `data/kev.json` (1,756 entries) |
| npm registry | Candidate versions for the upgrade planner | |
| Gemini API (Google AI) | Reads advisories, checks usage in your code | See section 5 |

### Architecture
One TypeScript project in npm workspaces, no database.

```
Browser (React 19 + Vite)
   │  POST /api/scan  { lockfile, sources? } or { sample: true }
   ▼
Express API (Node + TypeScript)             server/src/index.ts
   1. parse    package-lock.json → packages     pipeline/parse.ts
   2. match    OSV batch query → advisories     pipeline/osv.ts, match.ts
   3. enrich   EPSS + KEV                       pipeline/enrich.ts
   4. score    tier rules → reasons             pipeline/score.ts
   5. ai       Gemini usage check (top 10)      pipeline/ai.ts
   6. rescore  with AI verdicts (raise only)    pipeline/score.ts
   7. plan     safe upgrade versions            pipeline/plan.ts
   └─ cache    every external response saved to disk   cache.ts
```

- **Parser:** reads lockfile versions 2 and 3. For each package it records exact version, direct vs transitive, production vs dev, and the shortest chain of packages that pulled it in.
- **Cache and offline mode:** every external HTTP response is saved under `.cache/`; committed copies in `data/snapshots/` are read first. With `OFFLINE=1` the app runs with no network, so the demo survives bad venue Wi-Fi.
- **Shared types:** `server/src/types.ts` defines the data passed between steps; the client has a synced copy.
- **Security of our own app:** the Gemini key stays on the server and in a git-ignored `.env`; uploaded projects are never installed or executed; advisory text is rendered as plain text, never HTML.

### Repository layout
```
server/   Express API and the pipeline
client/   React dashboard
samples/  QuickNotes: a deliberately outdated demo app, plus the OSV-Scanner baseline
data/     KEV list and offline snapshots
docs/     PLAN.md, TEAM.md, task briefs, this file
```

### Team and process
Three systems work in parallel (see [TEAM.md](TEAM.md)): the Mac (Claude Code: integration, Gemini layer, merging), and two opencode machines (backend hardening and verify-fix; frontend and pitch). Each owns separate files and works on its own branch; the Mac merges into `main`.

## 5. Where AI is used (Gemini)

Matching is exact, so AI is **not** used there. It is used for steps whose input is prose or code:

1. **Read the advisory:** extract which functions or options are vulnerable and under what conditions.
2. **Find usages in your code:** a plain text search finds where your code imports the package and mentions those functions.
3. **Judge the usage:** Gemini decides whether the call matches the vulnerable pattern (for example, whether the input is user-controlled) and cites file and line.

Guardrails:
- A package that is not imported anywhere gets "no vulnerable usage found" without any AI call.
- Each citation is checked: the quoted text must exist at that file and line, or it is dropped. A "uses the vulnerable API" verdict with no valid citation is downgraded to "uncertain".
- Secrets (API keys, tokens, private keys) are masked before anything is sent.
- Calls are paced to the rate limit (`GEMINI_RPM`, default 4 for free-tier keys) and wait out 429 responses.
- If the AI fails or is off, the app still works; the funnel shows that the AI stage did not run.

## 6. Demo project and how we verify

**QuickNotes** (`samples/demo-app`) is a small Express app with deliberately old dependencies and planted cases: some call a vulnerable function with user-controlled input (`_.template(req.body.template)`, `axios.get(req.query.url)`, `jwt.verify` without `algorithms`, ejs render options from the query string), some use the package safely, and one is imported nowhere. `EXPECTED.md` lists every case and the expected AI verdict.

**Measured so far**
| Check | Result |
|---|---|
| Matching vs Google's OSV-Scanner on the sample | 251 packages, 76 advisories: identical, none missing, none extra |
| Upgrade plans | 21 vulnerable packages, all with a verified fix |
| Tiers without AI | 3 Fix now, 23 Fix this sprint, 30 Plan, 20 Monitor |
| Dashboard against the live API | Funnel, list, detail panel and upgrade plan work |
| Gemini verdicts vs `EXPECTED.md` | **Not yet verified.** The first run hit the free-tier rate limit; a paced recording is in progress |

## 7. Run it

```bash
npm install
cp .env.example .env     # add GEMINI_API_KEY (free key from Google AI Studio)
npm run dev              # API on :8787, dashboard on :5173
```
Open http://localhost:5173, upload `samples/demo-app/package-lock.json`, choose `samples/demo-app` as the source folder, and click **Scan**. (`POST /api/scan` with `{ "sample": true }` still scans the bundled sample for tests.)

Settings in `.env`: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-flash-latest`), `GEMINI_RPM` (default 4; raise with a paid key), `OFFLINE=1` (no network, snapshots only), `PORT`.

## 8. Limits and next steps
- npm only. A second ecosystem (Python `requirements.txt`) is planned if time allows.
- Free-tier Gemini keys make a first AI scan of a new project slow (about 5 minutes for 10 findings); results are then cached. The sample is pre-recorded for the demo.
- AI checks only the top 10 direct-dependency findings.
- Planned extras: "verify fix" (apply the plan to the lockfile and re-scan, clearly labelled as simulated), SARIF export, hardening of our own API (headers, rate limits, safe zip upload), and an AI summary of breaking changes for major upgrades.
- Risk indicators are guidance, not proof: EPSS is a probability, and AI assessments need human confirmation.
