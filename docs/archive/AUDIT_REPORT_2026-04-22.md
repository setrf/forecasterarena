# Release Readiness Audit Report

> Historical document: this audit captured the April 22, 2026 release-candidate
> state. Its findings are retained for audit history and should not be read as
> current open issues without re-verifying against the current codebase.

Date: 2026-04-22

Scope: current local workspace on `main`, including the uncommitted simplification refactor, plus pre-existing dirty docs files `docs/README.md` and `docs/CODE_MAP.md`.

## Executive Summary

Release confidence: medium, but not deploy-ready yet.

The simplification refactor looks behavior-preserving in the API route wrappers, portfolio summary helper, and admin benchmark validation helper. TypeScript, unit tests, architecture checks, query checks, build, empty-state E2E, and fresh source route smoke all pass.

The release candidate still has three practical blockers:

1. `npm run test:e2e` fails in the rich seeded scenario.
2. The weekly decision cron can still return a successful HTTP response when every model decision fails, which is especially risky given the known OpenRouter `402 Payment Required` production failure mode.
3. Production must close the raw app-port exposure before v2 supersedes the current build.

Do not deploy v2 over production until the P1 findings below are fixed or explicitly accepted with compensating checks.

## Remediation Update

Follow-up remediation on 2026-04-22 addressed the local release-candidate blockers found in this audit:

- Rich E2E now passes after making the rich fixture non-aging and updating stale v2 copy assertions.
- `run-decisions` now returns a cron failure when every processed agent fails and logs a dedicated `decisions_run_failed` error event.
- V2-facing docs and public copy now mark v2 as current, move Brier into historical/diagnostic language, and align operations docs with systemd/current VPS paths.

Verification after remediation:

- `git diff --check`: pass
- `npm run typecheck`: pass
- `npm run test`: pass, 55 files / 301 tests
- `npm run check:architecture`: pass
- `npm run check:queries`: pass
- `npm run test:e2e`: pass, 15 passed / 2 skipped
- `npm run test:e2e:empty`: pass, 2 passed
- `npm run build`: pass
- production `next start` smoke on `localhost:3001`: `200` for `/`, `/models`, `/cohorts`, `/markets`, `/methodology`, `/about`, and `/changelog`

Remaining deploy gates are production-operational: verify OpenRouter credit with a small live call, take and restore-test a fresh production backup, and confirm raw app ports are blocked or localhost-only.

## Production Gate Update

Production checks run on 2026-04-22 against `178.128.69.150`:

- VPS orientation:
  - `forecasterarena.service` active
  - runtime path: `/opt/forecasterarena-release-20260308-161644`
  - state path: `/opt/forecasterarena-state`
  - disk after backup test: 24 GB total, 17 GB used, 6.8 GB free, 71% used
  - required env names present: `OPENROUTER_API_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD`, `DATABASE_PATH`, `BACKUP_PATH`
- OpenRouter smoke:
  - first tiny `deepseek/deepseek-v3.2` chat completion returned `402 Payment Required`
  - after credits were added, the same smoke returned 200
  - returned model: `deepseek/deepseek-v3.2-20251201`
  - usage: 50 total tokens, reported cost `$0.000019873`
  - this gate is now passed
- Backup and restore test:
  - created `/opt/forecasterarena-state/backups/forecaster-2026-04-22T20-30-43-164Z.db`
  - backup size: 615 MB / 644,403,200 bytes
  - direct `PRAGMA integrity_check`: `ok`
  - copied restore test in `/tmp`: `PRAGMA integrity_check` `ok`
  - copied restore row counts: 20 cohorts, 5,826 markets, 1,285 decisions, 1,234,212 portfolio snapshots
  - temporary restore copy removed
- Forecaster raw app port:
  - added systemd drop-in `/etc/systemd/system/forecasterarena.service.d/10-bind-localhost.conf`
  - restarted `forecasterarena.service`
  - service now runs `npm start -- --hostname 127.0.0.1`
  - local `127.0.0.1:3010/api/health`: 200
  - public `https://forecasterarena.com/api/health`: 200
  - external probe to `178.128.69.150:3010`: connection refused

Non-Forecaster VPS exposure remains outside this app release gate: ports `4006` and `8390` are still externally reachable and should be reviewed separately before a broader host-hardening pass.

## Findings

### P1: Rich E2E release gate fails because seeded performance data is outside the default chart range

Files:

- `playwright/interactions.spec.ts`
- `playwright/public-pages.spec.ts`
- `playwright/smoke.spec.ts`
- `playwright/navigation-and-filters.spec.ts`
- `scripts/e2e-db/scenarios/rich.mjs`
- `lib/application/performance.ts`

Evidence:

- `npm run test:e2e` failed: 4 failed, 11 passed, 2 skipped.
- Failures:
  - `home chart controls work against the seeded performance data`: timed out waiting for the `$ Value` button.
  - `models and research pages stay navigable from real UI links`: timed out waiting for `View All Models`.
  - `public routes render the seeded benchmark state`: expected old `AI Models` heading.
  - `market filters and footer navigation stay usable`: expected an `h1` named `Changelog`, while the page now renders `Methodology and platform changes`.
- Manual probe against the rich fixture returned `200 /api/performance-data?range=1M` with `"data":[]`.
- The fixture snapshots are fixed at `2026-03-02` and `2026-03-07`; on 2026-04-22, the default `1M` chart range starts after those snapshots.

Impact:

The browser release gate is red. Some failures are stale-copy assertions from the v2 rewrite, but the chart failure also exposes a time-dependent fixture problem: this test can age out again as wall-clock time moves.

Recommendation:

Make the rich fixture relative to the test run date, or have the E2E chart test request/select `ALL` before expecting the value toggle. Then update the public-page assertions to the current v2 copy and navigation labels.

### P1: `run-decisions` can report success even when all model calls fail

Files:

- `lib/application/cron/runDecisions.ts`
- `lib/engine/decision/runAllDecisions.ts`
- `lib/engine/decision/runCohortDecisions.ts`
- `docs/V2_ROLLOUT_PLAN.md`

Evidence:

- `runDecisions()` always returns `ok({ success: true, total_errors, results })` after `runAllDecisions()` completes, even when `totalErrors` equals `totalAgents`.
- `runCohortDecisions()` records per-agent failures into `result.errors`, then returns the cohort result.
- `docs/V2_ROLLOUT_PLAN.md` records recent production `OpenRouter API error: 402 Payment Required` decision runs and explicitly calls out the need to make all-`ERROR` runs obvious.

Impact:

A production Sunday run can fail every model due to billing/auth/provider issues and still produce a `200` cron response with `success: true`. That weakens release monitoring and can make a broken v2 launch look operationally healthy.

Recommendation:

Treat all-agent failure as a failed cron result, or at minimum add a distinct `success: false`/`status: degraded` field plus admin-visible and log-visible alerts. Gate deployment on an OpenRouter credit check and a small authenticated model-call smoke test.

### P1: Production raw service ports must be closed or bound to localhost before v2 replaces prod

Files:

- `docs/V2_ROLLOUT_PLAN.md`
- `docs/DEPLOYMENT.md`
- Production host configuration

Evidence:

- `docs/V2_ROLLOUT_PLAN.md` records that the VPS firewall was inactive and raw app ports were reachable directly.
- `docs/DEPLOYMENT.md` recommends binding to `127.0.0.1:3010` or enforcing firewall rules so Nginx is the only public entrypoint.

Impact:

If raw app ports remain public, traffic can bypass the intended Nginx boundary and any future proxy-level protections. Cron/admin routes still have app-layer auth and rate limiting, but prod should not expose internal service ports directly.

Recommendation:

Before deploy, set the systemd service to bind only to localhost where supported, or enforce host firewall rules that expose only 80/443/22. Verify externally that `3010` and any old raw service ports are not reachable.

### P2: Public v2 product surfaces still expose v1/Brier-primary framing

Files:

- `features/markets/detail/components/MarketBrierScoresTable.tsx`
- `features/changelog/ChangelogPageContent.tsx`
- `docs/CODE_MAP.md`
- `docs/SCORING.md`
- `docs/PROMPT_DESIGN.md`

Evidence:

- Market detail renders a visible `Brier Scores` table for resolved markets.
- Changelog only contains `v1`, marks it as `Current`, and lists `Brier score + P/L dual scoring system`.
- `docs/CODE_MAP.md` describes the project as using "post-resolution Brier scoring" and lists measurement as "mark-to-market PnL... and Brier scoring".
- `docs/SCORING.md` and `docs/PROMPT_DESIGN.md` remain v1/Brier-centered.

Impact:

The methodology page now correctly says v2 is a reality-grounded LLM evaluation ranked by portfolio value, but adjacent surfaces can still make v1 calibration/Brier look current or primary.

Recommendation:

Add a v2 changelog entry and mark v2 current. Move Brier surfaces into clearly historical/diagnostic labels, or hide them from primary public v2 flows. Update `docs/CODE_MAP.md`, `docs/SCORING.md`, and `docs/PROMPT_DESIGN.md` to distinguish v1 history from v2 release semantics.

### P2: Operations runbook still contains PM2-era commands despite systemd production reality

Files:

- `docs/OPERATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/V2_ROLLOUT_PLAN.md`

Evidence:

- `docs/OPERATIONS.md` still instructs operators to run `pm2 status` and `pm2 logs forecaster-arena --lines 100`.
- `docs/DEPLOYMENT.md` and `docs/V2_ROLLOUT_PLAN.md` correctly describe the current production model as systemd plus Nginx, state under `/opt/forecasterarena-state`, app port `3010`, and cron under `/etc/cron.d/forecasterarena`.

Impact:

An operator following the runbook during rollout or incident response could inspect the wrong process manager and miss the real systemd service state.

Recommendation:

Update `docs/OPERATIONS.md` to use `systemctl status forecasterarena`, `journalctl -u forecasterarena`, `/var/log/forecaster-arena`, and `/opt/forecasterarena-state/data/forecaster.db`.

### P2: The `localhost:3000` instance is stale and does not represent this release candidate

Files:

- Local runtime process
- `app/methodology/page.tsx`

Evidence:

- Plan smoke command against `http://localhost:3000` returned:
  - `200 /`
  - `200 /models`
  - `200 /cohorts`
  - `200 /markets`
  - `200 /about`
  - `404 /methodology`
- `lsof` showed a `next-server` process on port `3000` with more than 13 hours of uptime.
- A fresh dev server on port `3001` returned `200` for all six public routes, including `/methodology`.
- `npm run build` also listed `/methodology` as a static route.

Impact:

The in-app browser at `localhost:3000` can mislead acceptance testing. The source route is present, but the running local instance is stale.

Recommendation:

Restart the local server before visual acceptance. After E2E, rerun `npm run build` before using `npm run start`, because the Playwright dev server can leave `.next` in a non-production state.

### P3: Dirty docs need an explicit release disposition

Files:

- `docs/README.md`
- `docs/CODE_MAP.md`

Evidence:

- `docs/README.md` has one change adding a link to `docs/CODE_MAP.md`.
- `docs/CODE_MAP.md` is untracked and currently contains stale v1/Brier-forward language.

Impact:

If `docs/README.md` is committed without a v2-correct `docs/CODE_MAP.md`, it links to a missing file. If both are committed as-is, the code map conflicts with the v2 methodology framing.

Recommendation:

Either update and include both docs in the release commit, or exclude both from the release commit until `CODE_MAP.md` is v2-correct.

### P3: Shared helper refactor is clean, but direct tests would reduce future regression risk

Files:

- `lib/api/result-response.ts`
- `lib/application/portfolio-summary.ts`
- `lib/application/admin-benchmark/validation.ts`

Evidence:

- Route diffs preserve previous JSON shapes for lookup `404`, cron unauthorized `401`, and safe `500` errors.
- Portfolio summary helper preserves the previous latest-snapshot-then-calculated-value fallback.
- Admin validation helper preserves required string and non-negative numeric checks.
- Existing tests passed indirectly, but the new helpers do not have dedicated unit coverage.

Impact:

Current risk is low. Future edits to these shared helpers would affect many routes at once.

Recommendation:

Add narrow unit tests for `applicationResultJson`, `cronResultJson`, `lookupResultJson`, `resolveAgentPortfolioSummary`, and the admin benchmark validation helpers.

## Verification Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` | Pass | `main...origin/main`; uncommitted refactor plus `docs/README.md`, untracked `docs/CODE_MAP.md`, `lib/api/result-response.ts`, `lib/application/admin-benchmark/validation.ts`, `lib/application/portfolio-summary.ts`. |
| `git diff --stat` | Pass | 18 tracked files changed, 74 insertions, 282 deletions. |
| `git diff --check` | Pass | No whitespace errors. |
| `npm run typecheck` | Pass | No TypeScript errors. |
| `npm run test` | Pass | 54 test files, 299 tests passed. Expected warning logs appeared for production env simulations and mocked provider failures. |
| `npm run check:architecture` | Pass | `Architecture check passed`. |
| `npm run check:queries` | Pass | `Query structure checks passed.` |
| `npm run build` | Pass | Build completed. Static generation logged expected warnings for missing production secrets in local env. |
| `npm run test:e2e` | Fail | 4 failed, 11 passed, 2 skipped. See P1 E2E finding. |
| `npm run test:e2e:empty` | Pass | 2 passed. |
| Node route smoke against `localhost:3000` | Mixed | `/`, `/models`, `/cohorts`, `/markets`, `/about` returned 200; `/methodology` returned 404 due stale running instance. |
| Node route smoke against fresh `localhost:3001` dev server | Pass | All six public routes returned 200. |

## Regression Risks

The simplification refactor mainly removes repetition. I checked the changed surfaces against previous behavior:

- API result response helper: preserves `{ error }` shape for 404/500 and cron unauthorized 401. Cron route behavior remains app-result-based and does not add a catch-all around thrown errors.
- Portfolio summary helper: preserves the previous source of truth order: latest snapshot first, calculated actual value if no snapshot exists, `INITIAL_BALANCE` for derived P/L percent.
- Admin benchmark validation helper: preserves trimming and empty-string rejection behavior while moving duplicated logic into one module.

The main remaining regression risk is not the helper extraction itself. It is the broader fact that portfolio value/ranking is now the primary v2 public metric while some historical Brier fields and docs remain active in adjacent surfaces.

## Release Checklist

- Fix or update `npm run test:e2e` until the rich scenario passes.
- Add a degraded/failure signal for all-agent decision failures before the next production Sunday run.
- Verify OpenRouter account credit and run a small model-call smoke test.
- Restart the local acceptance server and verify `/methodology` on the actual acceptance port.
- Rerun `npm run build` after browser tests before using `npm run start`.
- Close or localhost-bind raw production app ports; verify only intended public ports are reachable.
- Create a fresh production backup and verify restore in staging.
- Run production DB `PRAGMA integrity_check` on a copy before deployment.
- Update `docs/OPERATIONS.md` to match systemd/Nginx/current state paths.
- Decide whether to include or exclude `docs/README.md` and `docs/CODE_MAP.md`; do not ship the README link without a v2-correct code map.
- Add a v2 changelog entry and clarify all remaining Brier surfaces as historical or diagnostic.

## Follow-Up Refactors

- Add direct tests around `lib/api/result-response.ts`, `lib/application/portfolio-summary.ts`, and `lib/application/admin-benchmark/validation.ts`.
- Extend the API response helper pattern to the remaining list/read routes only after helper tests exist.
- Split historical v1 scoring docs from current v2 public scoring docs.
- Add a predeploy script that runs DB integrity, row-count sanity checks, health route checks, cron-auth checks, and OpenRouter smoke.
- Consider server-rendering the home summary to reduce initial empty UI during client fetches.
- Add an admin/health warning for recent repeated OpenRouter auth, billing, or all-agent decision failures.
