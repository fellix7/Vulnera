# System 3 brief: Frontend + pitch

You are building part of **Vulnera**, an npm dependency-vulnerability triage tool (read `README.md`, `docs/PLAN.md`, `docs/TEAM.md`, `server/src/types.ts`). The judges are from cybersecurity and see the UI first, so clarity and trust matter more than decoration.

**Branch:** `sys3/frontend`. **You own only:** `client/**` and `docs/PITCH.md`. Do not edit `server/**` or other docs. Wait until System 1 tells you the dashboard is on `main` (a first version is being built by an agent right now); then branch from `main`.

Until `/api/scan` returns real data, use `http://localhost:5173/?mock=1` (mock data lives in `client/src/mock.ts`). `client/src/types.ts` mirrors `server/src/types.ts`; if the server types change, System 1 will tell you.

## Task A: make the existing dashboard excellent
1. **Real API**: confirm the scan flow works end to end with the real server (upload `package-lock.json` and optionally a source folder; the sample is `samples/demo-app`. The "Scan sample project" and "View demo data" buttons were removed on purpose, so do not add them back; `?mock=1` still loads mock data for development), loading state with step text, readable error messages from `{ error }` responses.
2. **Funnel** at the top: Known vulnerabilities → In production code → Your code calls the vulnerable function → Fix now. It is the signature feature; make it the first thing the eye lands on. Show "AI analysis off" clearly when `aiStatus !== 'ok'` so the funnel's third stage is not misread.
3. **Finding detail**: advisory text is untrusted, render as plain text only, never `dangerouslySetInnerHTML`; external links `rel="noopener noreferrer"`, http/https only.
4. **Human review**: confirm/dispute the AI verdict, lower priority (disabled for KEV findings with a tooltip explaining why).
5. **Accessibility and mobile**: keyboard-reachable everything, visible focus, text labels with colours, no horizontal scroll at 375 px, works in dark mode.
6. **Exports**: Markdown and JSON download buttons produce files with the summary, funnel, findings by tier with reasons, upgrade commands, AI citations and a "needs human confirmation" disclaimer.

## Task B (after System 1 exposes it): "Verify fix" view
A button "Apply plan and re-scan" calls `POST /api/verify` (System 1 will confirm the exact shape; expect `{ before, after, diff: { resolved, remaining, introduced } }`) and shows a before/after panel: resolved findings struck through in green, remaining in amber, introduced in red. Label it clearly as **simulated** (lockfile hashes are not regenerated). Build it against mock data first.

## Task C: pitch material, `docs/PITCH.md`
- A 3-minute demo script: problem in one line → scan the sample → the funnel narrows → open a finding with the cited line of code → apply the plan and re-scan → "we ran Vulnera on Vulnera".
- Answers (3 sentences each) to the likely judge questions: "How is this different from npm audit / Dependabot / Snyk?", "Can the AI hallucinate a finding?" (no: AI annotates, it never creates or removes findings, and every citation is machine-checked), "What do you send to Google?" (snippets only, secrets masked), "Is it safe to upload my project?" (never installed or executed), "Why trust the ranking?" (rule-based, thresholds shown, KEV and EPSS are public data).
- No invented statistics: use only numbers the tool actually produces on the sample.

## Delivery
Push to `sys3/frontend` after each task. Run `npm run build -w client` before every push (it includes the type check). Tell System 1 when each task is ready to merge.
