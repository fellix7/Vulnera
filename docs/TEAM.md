# Team split: 3 systems

Deadline: **feature freeze 16:00 IST**, demo before 17:00. Repo: https://github.com/fellix7/Vulnera

| System | Who/what | Owns | Why this one |
|---|---|---|---|
| **1: Mac** | Rishit + Claude Code (parallel agents) | `main`, `server/src/index.ts`, `server/src/types.ts`, `server/src/pipeline/**`, `samples/`, `data/`, `docs/DEMO.md` | Only system with Claude. Does the integration, the Gemini work and all merging, which are the hardest and most conflict-prone parts |
| **2: opencode** | Verify & Harden (backend, new files only) | `server/src/verify/**`, `server/src/security/**`, `server/src/report/**` | Self-contained modules with exact signatures; no edits to shared files |
| **3: opencode** | Frontend + pitch | `client/**`, `docs/PITCH.md` | Starts when the dashboard lands on `main`; the UI is the part judges see |

Task briefs: [system-2.md](tasks/system-2.md), [system-3.md](tasks/system-3.md). Give the brief to the opencode model as its first prompt.

## Already done on `main` (System 1's agents)
Lockfile parser, OSV client + matcher + upgrade planner, EPSS/KEV enrichment + tier scoring (with check scripts under `server/src/pipeline/__checks__/`). Still being built by agents: sample project, dashboard, Gemini layer.

## Rules (all systems)
1. **One branch per system**: `sys2/verify-harden`, `sys3/frontend`. Never commit to `main` directly; System 1 merges.
2. **Only edit files you own** (table above). Need a change in someone else's file or in `types.ts`? Message System 1; do not edit it.
3. **Commit small and often**, `git pull --rebase origin main` before each push.
4. **No secrets in git.** Each system makes its own `.env` from `.env.example` (own Gemini key from AI Studio).
5. **Never run `npm install` inside `samples/demo-app`**; lockfile generation uses `--package-lock-only --ignore-scripts`.
6. Server code is ESM + NodeNext: relative imports end in `.js`. Run `npm run typecheck` before every push.
7. Adding a dependency is fine in your own workspace; mention it in the commit message, System 1 will regenerate the root lockfile after merging.

## Checkpoints
| Time | Goal |
|---|---|
| 12:30 | Repo access sorted; every system has cloned and runs `npm run dev` |
| 13:15 | **Integration checkpoint**: `/api/scan` returns a real ranked list for the sample (System 1). System 2 and 3 push first working version of their branch |
| 15:30 | Last merge window; only fixes after this |
| 16:00 | **Feature freeze.** Offline test (`OFFLINE=1`), rehearse the demo 3 times |

## Dependencies between systems
- System 3 needs the dashboard branch on `main` (System 1 merges it as soon as the agent finishes, then tells System 3).
- System 3 needs `/api/scan` working for real data; until then it uses `?mock=1`.
- System 1 wires System 2's modules into `index.ts`; System 2 does not touch `index.ts`.

## Cut order if time runs short
Drop in this order: SARIF export → upgrade-risk AI summary → verify-fix simulation → hardening extras. **Never drop**: scan → ranked list → upgrade plan → AI usage verdict → offline mode.
