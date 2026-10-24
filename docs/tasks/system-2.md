# System 2 brief: Verify & Harden (backend)

You are building part of **Vulnera**, an npm dependency-vulnerability triage tool (read `README.md`, `docs/PLAN.md`, `docs/TEAM.md`, `server/src/types.ts`). The judges are from cybersecurity, so these modules make the tool safe to attack-test and prove its fixes work.

**Branch:** `sys2/verify-harden`. **You own only:** `server/src/verify/**`, `server/src/security/**`, `server/src/report/**`. Do not edit `types.ts`, `index.ts`, `pipeline/**` or anything else; System 1 wires your modules into the API. ESM + NodeNext: relative imports need `.js`. `npm run typecheck` must pass. Each module gets a `__checks__/*.check.ts` script using `node:assert` (run with `npx tsx <file>`).

## Task A (highest value): "Verify fix" simulation, `server/src/verify/`
Shows before/after: apply the upgrade plan, re-scan, show what disappears.
```ts
// applyPlans.ts
export function applyPlans(lock: unknown, plans: UpgradePlan[]): unknown
```
Returns a deep copy of the lockfile where, for every plan with `to !== null`, every `packages["node_modules/.../<name>"]` entry whose version equals `plan.from` gets `version = plan.to`, and `resolved` / `integrity` are deleted (we cannot know the new hashes). Never mutate the input. Plans with `to === null` are skipped.
```ts
// diff.ts
export function diffScans(before: ScanResult, after: ScanResult): {
  resolved: Finding[];    // in before, not in after
  remaining: Finding[];   // in both
  introduced: Finding[];  // in after, not in before
}
```
Match findings with `findingKey(pkg, advisory)` from `server/src/keys.ts`. Note the key includes the version, so a fixed package changes key; match "resolved" by (package name, advisory id) instead and document why.
Check: build a small lockfile fixture, apply a plan, assert versions changed and input untouched; diff two hand-made `ScanResult`s.

## Task B: Hardening the API surface, `server/src/security/`
Judges may try to attack our own app. Provide Express-compatible pieces (no new framework; `express` types are available):
- `headers.ts`: `securityHeaders(): RequestHandler` setting CSP (`default-src 'self'`, allow inline styles only if needed), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-origin`. No `X-Powered-By` (export a helper to call `app.disable`).
- `rateLimit.ts`: `rateLimit({ windowMs, max }): RequestHandler`, simple in-memory per-IP limiter, returns `429` JSON `{ error }` with `Retry-After`.
- `validate.ts`: `validateScanRequest(body: unknown): ScanRequest` that throws `HttpError(400, message)` (export `HttpError`) for: non-object body, lockfile not an object, more than 5000 `packages` entries, `sources` not an array, more than 300 files, a file over 500 KB or 3 MB total, non-string `path`/`content`, any `path` containing `..`, a leading `/`, a backslash or a NUL byte. Returns the cleaned request. Also export `errorHandler(): ErrorRequestHandler` that maps `HttpError` to its status and everything else to a generic 500 `{ error: "Internal error" }` (never leak stack traces).
- `zip.ts` (optional upload of a zipped project): `extractSources(zip: Buffer): SourceFile[]` using a small, well-known library (`yauzl` or `adm-zip`; add to the server workspace). Must defend against **zip slip** (reject entries escaping the root), zip bombs (max 300 entries, max 3 MB uncompressed total, check declared sizes AND actual bytes read), symlinks (skip). Only keep `.js .jsx .ts .tsx .mjs .cjs`, skip `node_modules`, `.git`, `dist`, `build`. Never write to disk; work in memory. `SourceFile` is in `types.ts`.
- Checks must include hostile inputs (path traversal, oversized, wrong types, a zip with `../evil.js`).

## Task C (stretch): SARIF export, `server/src/report/sarif.ts`
```ts
export function toSarif(result: ScanResult): object   // SARIF 2.1.0
```
One `run`, tool name `Vulnera`, one `rule` per advisory id, one `result` per finding; `level` from tier (FIX_NOW/FIX_SPRINT → `error`/`warning`, PLAN → `note`, MONITOR → `note`); location = the AI citation if present, otherwise `package-lock.json`; `message` = the finding's reasons joined. Check the output has the required SARIF 2.1.0 top-level fields.

## Delivery
Push to `sys2/verify-harden` after each task. Message System 1 with the exported signatures you actually shipped. Do not wait for review to start the next task.
