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
client/   React + Vite dashboard
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

## Security notes

- Uploaded projects are only read, never installed or executed.
- Only small code snippets around usages are sent to Gemini.
- The Gemini API key stays on the server.

See [docs/PLAN.md](docs/PLAN.md) for the full plan.
