# Vulnera

**Tells you which vulnerable dependencies to fix first, and why.**

Built for Tech Yuva × GDG Gurugram Build-a-thon 2026, problem statement **PS-09: Software Dependency Vulnerability Checker**.

`npm audit` lists every known vulnerability. Vulnera ranks them by real-world risk (exploitation data, production vs dev, whether *your code* calls the vulnerable function) and gives the exact version to upgrade to.

## How it works

1. Upload a `package-lock.json` (and optionally your source code).
2. Every installed package is matched against [OSV.dev](https://osv.dev).
3. Findings are enriched with [FIRST EPSS](https://www.first.org/epss/) scores and the [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) catalogue.
4. Fixed rules sort findings into tiers: **Fix now → Fix this sprint → Plan → Monitor**, each with stated reasons.
5. Gemini reads the top advisories, checks whether your code uses the vulnerable function, and cites the exact line. Citations are verified automatically.
6. Each package gets a minimum safe version, re-checked against OSV, plus the command to run.

AI never decides whether a package is vulnerable; that is an exact lookup. AI only adds context, and only a person can lower a finding's priority.

## Project layout

```
server/   Express + TypeScript API (scan pipeline)
client/   React + Vite app (landing page, overview, findings, code evidence, remediation, reports)
samples/  Deliberately outdated demo project
data/     KEV list and offline API snapshots for the demo
docs/     Plan and design notes
```

## Running locally

```bash
npm install
cp .env.example .env   # add your GEMINI_API_KEY
npm run dev            # server on :8787, client on :5173
```

Open http://localhost:5173. Without a lockfile handy, use **Scan the bundled sample project** (a real pipeline run on `samples/demo-app`) or **Explore demo data** (illustrative, labelled, instant). `?mock=1` still opens the demo data.

To point the client at an API on another port: `VITE_API_TARGET=http://localhost:8788 npm run dev -w client`.

## App pages

| Path | What it answers |
|---|---|
| `/` | What Vulnera is and why it differs from a scanner |
| `/scan` | Upload `package-lock.json` (+ optional source folder for the AI code check) |
| `/overview` | Current risk posture and the funnel: all → production → used by your code → fix now |
| `/findings` | Every finding, filterable and sortable; nothing is hidden |
| `/finding?key=…` | Why it was ranked, advisory, dependency chain, code evidence, review, fix |
| `/evidence` | Where your code reaches a vulnerable function, with verified citations |
| `/remediation` | Minimum safe versions and the exact commands, verified vs suggested |
| `/reports` | Markdown/JSON export, scan history (this browser only), before/after compare |

Design tokens and the page contract are in [docs/DESIGN.md](docs/DESIGN.md).

## Security notes

- Uploaded projects are only read, never installed or executed.
- Only small code snippets around usages are sent to Gemini.
- The Gemini API key stays on the server.

See [docs/PLAN.md](docs/PLAN.md) for the full plan.
