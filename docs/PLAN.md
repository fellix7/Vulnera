# Vulnera: build plan (PS-09)

## Problem
Detection of known-vulnerable dependencies is solved (`npm audit`, Dependabot, OSV-Scanner). The gap is **triage**: developers get dozens of alerts, can't tell which affect the running app, and don't know which upgrade is safe.

> Turn a raw list of vulnerable dependencies into a short fix order, backed by evidence, with the exact version to move to.

Out of scope: unpublished vulnerabilities, malware detection, running or exploiting anything.

## Users
- **Primary:** developers in small teams without security staff.
- **Secondary:** security reviewers and tech leads who need evidence and shareable reports.

## Core requirements
1. **Inventory**: read `package-lock.json` (v2/v3): exact version, direct vs transitive, production vs dev, the chain that pulled it in.
2. **Matching**: OSV.dev batch query → advisory details → severity, affected ranges, first fixed version. No AI here.
3. **Prioritised fix list**: tiers with reasons; minimum safe version, jump size (patch/minor/major), exact command.

## Where AI is used (Gemini, structured output)
1. Read advisory prose → vulnerable functions, preconditions, attack type, plain summary.
2. Check the user's code against those functions → verdict + cited file/line.
3. (Optional) Summarise breaking changes for major upgrades.

Guardrails:
- AI annotates; it never creates or deletes findings.
- AI may raise priority; lowering needs a person. KEV findings can never be lowered.
- Every citation is checked: quoted text must exist at that file and line, otherwise the verdict becomes "uncertain".

## Priority tiers (rules, configurable thresholds)
| Tier | Rule (first match wins) |
|---|---|
| Fix now | On KEV; or High/Critical in production code with EPSS ≥ 10% or AI-confirmed vulnerable usage |
| Fix this sprint | Other High/Critical in production code; Medium with EPSS ≥ 10% |
| Plan | Other production findings |
| Monitor | Dev-only packages |

Within a tier: EPSS, then severity. Missing EPSS/KEV data is shown as "no data", never as zero.

## Upgrade plan
- Smallest version ≥ every OSV "fixed" version for the package.
- Re-query OSV for that exact version so we don't upgrade into another vulnerability.
- `semver` diff → patch / minor / major.
- Transitive packages: name the direct dependency to upgrade; fallback npm `overrides` snippet.

## Mandatory vs optional
**Mandatory**
- [ ] `package-lock.json` v2/v3 parser
- [ ] OSV matching with fixed versions
- [ ] EPSS + KEV enrichment
- [ ] Tier rules with reasons
- [ ] Upgrade plan with verified minimum safe version + command
- [ ] Gemini advisory reading + code verdicts for top 10 direct-dependency findings, with citation check
- [ ] Dashboard: summary funnel, ranked list, finding detail
- [ ] Markdown/JSON report export
- [ ] Offline cache of every API response used in the demo

**Optional (in order)**
1. Before/after re-scan comparison
2. AI breaking-change summary for major upgrades (Gemini URL context)
3. Second ecosystem (`requirements.txt` or `pom.xml`)
4. SARIF export
5. `package.json`-only input via deps.dev
6. CLI mode for CI

## Architecture
```
Browser (React + Vite)
   │  upload lockfile (+ optional source zip)
   ▼
Express API (Node + TypeScript)
   ├─ parse   package-lock.json → inventory
   ├─ match   OSV.dev (batch query → advisory details)
   ├─ enrich  FIRST EPSS · CISA KEV (JSON loaded at startup)
   ├─ score   tier rules → reasons
   ├─ plan    semver + OSV re-check → minimum safe version
   ├─ ai      Gemini (structured output) → verdict + citations → validator
   └─ cache   JSON files on disk
```
- Gemini key server-side only.
- Uploaded projects are read, never installed or run.
- Zip uploads: size limit, reject paths escaping the extraction folder.
- Only snippets around usages go to Gemini.

## Build order (24 Oct, 9:00–17:00)
| Time | Work | Done when |
|---|---|---|
| 9:00–9:45 | Sample project + lockfile, KEV download, prompt tests in AI Studio, OSV-Scanner baseline | Sample + expected findings exist |
| 9:45–12:00 | Parser, matcher, enrichment, tier rules; UI shell | API returns ranked list from real data |
| 12:00–13:00 | Lunch, connect UI | Full scan works in UI without AI |
| 13:00–15:00 | Upgrade planner, Gemini layer, citation check | AI tags on top findings |
| 15:00–16:00 | Report export, funnel, polish | |
| 16:00 | Feature freeze, offline test, rehearse | |

## Risks
| Risk | Fallback |
|---|---|
| Wi-Fi/API failure in demo | Offline mode from cached snapshots |
| Ranges in `package.json` | Require lockfile; label "assumed" otherwise |
| Complex fixed-version ranges | Show "no verified fix" rather than guess |
| Transitive fix needs parent upgrade | Name parent; `overrides` snippet |
| KEV rarely lists npm packages; no EPSS without CVE | Show "no data"; never fake a KEV hit |
| Gemini bad JSON / wrong citations / slow | Schema + 1 retry, validator, cache; show rule-based results |
| Sending code externally | Snippets only; AI off switch |

## Success criteria
| Criterion | Target |
|---|---|
| Matching accuracy | Same findings as OSV-Scanner on the sample |
| Fix correctness | Every suggested version clean when re-queried |
| Explanations | Every finding shows ≥ 1 reason |
| AI citations | 100% of displayed citations point to a real line |
| AI reliability | ≥ 95% valid JSON within two attempts |
| Speed | < 30 s with network, < 5 s from cache |
| Ease of use | Upload → ranked list in ≤ 3 clicks, < 1 min |
| Reliability | Full demo works offline |
