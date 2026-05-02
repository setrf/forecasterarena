# Forecaster Arena Operations Runbook

Last updated: 2026-04-22

This runbook documents how to operate the application that exists in the repository today. It focuses on practical runtime procedures, verification steps, and failure handling.

---

## 1. Operational Assumptions

This repository assumes:

- a single deployed application instance,
- a single SQLite database file,
- externally scheduled cron calls,
- no background worker queue,
- no distributed rate limit,
- paper-trading only.

Because orchestration is route-driven, healthy operations depend on cron timing, environment configuration, and the SQLite file all being correct.

Current production VPS baseline:

- runtime: Next.js served by `forecasterarena.service` under systemd, behind Nginx
- public domain: `https://forecasterarena.com`
- active release shape: copied release snapshots under `/opt/forecasterarena-release-*`
- current production release path: `/opt/forecasterarena-release-20260308-161644`
- state path: `/opt/forecasterarena-state`
- database path: `/opt/forecasterarena-state/data/forecaster.db`
- backup path: `/opt/forecasterarena-state/backups`
- app port: `3010`, intended to be reached through Nginx or localhost cron calls
- scheduler file: `/etc/cron.d/forecasterarena`

---

## 2. Required Environment

Production should define all of the following:

- `OPENROUTER_API_KEY`
- `CRON_SECRET`
- `ADMIN_PASSWORD`
- `DATABASE_PATH=/opt/forecasterarena-state/data/forecaster.db`
- `BACKUP_PATH=/opt/forecasterarena-state/backups`
- `DECISION_COHORT_LIMIT=5` (optional; defaults to `5`)
- `NEXT_PUBLIC_SITE_URL` (recommended)
- `NEXT_PUBLIC_GITHUB_URL` (optional)

Important current behavior:

- If `CRON_SECRET` is missing in production, cron routes fail closed.
- If `ADMIN_PASSWORD` is missing in production, admin login fails closed.
- If `OPENROUTER_API_KEY` is missing in production, decision routes and model calls fail.
- `GET /api/health` reports configuration incompleteness generically; it does not list missing secret names.

---

## 3. Recommended Cron Schedule

The code does not contain its own scheduler. The currently intended cadence is:

```cron
# Sync top markets from Polymarket
*/5 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/sync-markets \
  -H "Authorization: Bearer $CRON_SECRET"

# Start the weekly cohort at Sunday 00:00 UTC
0 0 * * 0 curl -s -X POST http://127.0.0.1:3010/api/cron/start-cohort \
  -H "Authorization: Bearer $CRON_SECRET"

# Run model decisions after cohort creation
5 0 * * 0 curl -s -X POST http://127.0.0.1:3010/api/cron/run-decisions \
  -H "Authorization: Bearer $CRON_SECRET"

# Re-check closed markets for resolution
0 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/check-resolutions \
  -H "Authorization: Bearer $CRON_SECRET"

# Mark to market unarchived active cohorts
*/10 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/take-snapshots \
  -H "Authorization: Bearer $CRON_SECRET"

# Check OpenRouter for newer general-purpose model releases
0 9 * * 1 curl -s -X POST http://127.0.0.1:3010/api/cron/check-model-lineup \
  -H "Authorization: Bearer $CRON_SECRET"

# Create a database backup before the next weekly cycle
0 23 * * 6 curl -s -X POST http://127.0.0.1:3010/api/cron/backup \
  -H "Authorization: Bearer $CRON_SECRET"
```

Why this schedule matters:

- `run-decisions` assumes `start-cohort` has already executed or that the weekly cohort can still be bootstrapped.
- `run-decisions` only spends LLM calls on unarchived active cohorts inside the latest decision window; older current v2 cohorts remain tracking-only.
- `check-resolutions` only processes markets that are locally `closed`.
- `check-model-lineup` only reads the public OpenRouter catalog and creates an admin review. It never promotes releases or rolls cohorts without operator approval.
- `take-snapshots` is most useful when run regularly; the database schema is timestamp-based, not day-based, archived v1 cohorts are intentionally excluded from routine snapshots, and open-position valuation uses CLOB prices with prior-value fallback on anomalies.

---

## 4. Daily Checks

Run these at least once per day.

### 4.1 Health Endpoint

```bash
curl -s https://yourdomain.com/api/health | jq
```

Healthy example:

```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok" },
    "environment": { "status": "ok" },
    "data_integrity": { "status": "ok" }
  }
}
```

Unhealthy example:

```json
{
  "status": "error",
  "checks": {
    "database": { "status": "ok" },
    "environment": {
      "status": "error",
      "message": "Required configuration is incomplete"
    }
  }
}
```

Interpretation:

- `database = error` means the app could not open or query SQLite.
- `environment = error` means one or more required production settings are missing.
- `data_integrity = error` means the lightweight integrity probe failed or detected an issue.

### 4.2 Application Process Health

```bash
systemctl status forecasterarena --no-pager
journalctl -u forecasterarena --no-pager -n 100
```

Expected:

- the service is `active (running)`,
- no restart loop,
- no repeated OpenRouter timeout or auth failures.

### 4.3 Recent Errors

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT severity, event_type, created_at
  FROM system_logs
  WHERE severity = 'error'
  ORDER BY created_at DESC
  LIMIT 50;
"
```

Pay attention to:

- `cohort_start_error`
- `decisions_run_error`
- `agent_decision_error`
- `agent_decision_execution_failed`
- `market_resolution_partial_failure`
- `take_snapshots_error`
- `market_sync_error`

### 4.4 Market Freshness

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT MAX(last_updated_at) AS last_market_update,
         COUNT(*) AS total_markets
  FROM markets;
"
```

Interpretation:

- If `last_market_update` is stale, `sync-markets` is not running or is failing.
- If `total_markets` is zero in production, the public site will show empty-state copy instead of live benchmark copy.

---

## 5. Weekly Checks

Run these after the Sunday decision window.

### 5.1 Benchmark Lineup Control

The live benchmark now separates:

- `model_families`: stable public competitor slots
- `model_releases`: exact OpenRouter targets
- `benchmark_configs`: default lineup manifests that can seed future cohorts and refresh active cohorts
- `agents`: the frozen family/release/config assignment actually used by a cohort

Operational rule:

- register new releases and promote future configs through the admin benchmark control plane
- do not mutate old `models` rows expecting historical cohorts to follow along safely
- unarchived active cohorts refresh to the promoted default lineup before Sunday decision runs
- only decision-eligible active cohorts receive new LLM calls after that refresh
- archived v1 cohorts skip lineup refreshes, new decisions, and routine snapshots while remaining available for settlement and historical drilldowns
- historical decisions, trades, and brier scores keep their frozen release lineage even after active cohorts refresh

Recommended release-rotation workflow:

1. Confirm the new OpenRouter release is reachable and priced correctly.
2. `POST /api/admin/benchmark/releases` to register the exact release under its existing family.
3. `POST /api/admin/benchmark/configs` to build the next lineup.
4. Review the admin benchmark page and confirm every family points to the intended release and price snapshot.
5. `POST /api/admin/benchmark/default` to make that config the default lineup.
6. Use the admin rollover preview/apply flow if you want currently active cohorts to switch immediately.
7. Verify the next Sunday decision run refreshes active cohorts to the default lineup while historical decision/trade/brier records still show their original releases.

Rollback rule:

- if the wrong default lineup is promoted, promote the previous config again or use the admin rollover flow to apply the previous config to active cohorts

### 5.2 Cohort Existence

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT id, cohort_number, started_at, status
  FROM cohorts
  ORDER BY started_at DESC
  LIMIT 3;
"
```

Expected:

- one newly created weekly cohort,
- `started_at` normalized to the week start,
- `benchmark_config_id` populated for the new cohort,
- no duplicate cohort rows for the same Sunday.

### 5.3 Decision Coverage

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT cohort_id, decision_week, COUNT(*) AS decisions
  FROM decisions
  WHERE decision_timestamp > datetime('now', '-24 hours')
  GROUP BY cohort_id, decision_week
  ORDER BY decision_timestamp DESC;
"
```

Expected:

- one decision row per active agent in each decision-eligible unarchived cohort for the run,
- no new decision rows for older active cohorts outside the decision window,
- no duplicate rows for the same `(agent_id, cohort_id, decision_week)`.

Because the application now claims a single canonical decision row per agent/week, reruns should overwrite or reuse that row rather than add another one.

### 5.4 Trades Recorded

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT d.id, d.action, COUNT(t.id) AS trades
  FROM decisions d
  LEFT JOIN trades t ON t.decision_id = d.id
  WHERE d.decision_timestamp > datetime('now', '-24 hours')
  GROUP BY d.id, d.action
  ORDER BY d.decision_timestamp DESC;
"
```

Interpretation:

- `HOLD` with zero trades is normal.
- `BET` or `SELL` with zero trades is retryable but indicates an execution problem.

### 5.5 Snapshot Freshness

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "
  SELECT MAX(snapshot_timestamp) AS latest_snapshot,
         COUNT(*) AS snapshots_last_hour
  FROM portfolio_snapshots
  WHERE snapshot_timestamp > datetime('now', '-1 hour');
"
```

Important:

- The table uses `snapshot_timestamp`, not `snapshot_date`.
- Snapshot rows are upserted per `(agent_id, snapshot_timestamp)`.
- Price provenance for markets used in a run is stored in `market_price_snapshots`; fallback or Gamma/CLOB disagreement events are logged as `price_validation_anomaly`.

---

## 6. Manual Operations

### 6.1 Sync Markets

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use when:

- market totals look stale,
- close/resolution transitions appear delayed,
- local development database needs seeding.

### 6.2 Start Weekly Cohort

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/start-cohort \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use when:

- validating a fresh environment,
- recovering after a missed Sunday run.

Current safeguards:

- the operation is week-unique,
- repeated calls in the same week return the existing cohort,
- agent creation is physically idempotent by the frozen slot key `(cohort_id, benchmark_config_model_id)`,
- the canonical benchmark identity is carried by `benchmark_config_id` and each agent’s `benchmark_config_model_id`.

### 6.3 Run Decisions

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/run-decisions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use sparingly.

Current runtime behavior:

- the route budget is 10 minutes,
- model calls are capped at 40 seconds each,
- transport retries are effectively disabled by default,
- malformed-output retries remain enabled once per model.

### 6.4 Check Resolutions

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/check-resolutions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Important current behavior:

- markets are only marked `resolved` after settlement succeeds,
- if one position fails to settle, the market remains `closed` locally and will be retried later.

### 6.5 Take Snapshots

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/take-snapshots \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Important current behavior:

- closed-but-unresolved positions can use prior value as a fallback,
- this prevents the portfolio curve from collapsing incorrectly when external prices become unusable.

### 6.6 Create Backup

```bash
curl -s -X POST http://127.0.0.1:3010/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Backups are written to `/opt/forecasterarena-state/backups` in production. If a local or staging environment omits `BACKUP_PATH`, the default is `backups/`.

### 6.7 Create Admin Export

Admin exports are cookie-authenticated, not cron-authenticated.

```bash
curl -s -X POST http://127.0.0.1:3010/api/admin/export \
  -H "Content-Type: application/json" \
  -H "Cookie: forecaster_admin=..." \
  -d '{
    "cohort_id": "cohort-id",
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-07T00:00:00.000Z",
    "include_prompts": false
  }'
```

Operational constraints:

- 7 day max range,
- 50,000 row cap per table,
- ZIP archive name is sanitized,
- old archives are cleaned after roughly 24 hours.

---

## 7. Diagnostic SQL

### 7.1 Decision Rows Still “In Progress”

```sql
SELECT id, agent_id, cohort_id, decision_week, decision_timestamp
FROM decisions
WHERE action = 'ERROR'
  AND error_message = '__IN_PROGRESS__'
ORDER BY decision_timestamp DESC;
```

Interpretation:

- a fresh row may simply represent a running decision,
- a stale row may indicate a crashed run that should be reclaimed by the next decision cycle.

### 7.2 Duplicate-Protection Sanity Checks

```sql
SELECT agent_id, cohort_id, decision_week, COUNT(*) AS cnt
FROM decisions
GROUP BY agent_id, cohort_id, decision_week
HAVING COUNT(*) > 1;
```

```sql
SELECT started_at, COUNT(*) AS cnt
FROM cohorts
GROUP BY started_at
HAVING COUNT(*) > 1;
```

Both queries should return zero rows.

### 7.3 Frozen Lineage Sanity Checks

```sql
SELECT id, cohort_number
FROM cohorts
WHERE benchmark_config_id IS NULL
ORDER BY cohort_number DESC;
```

```sql
SELECT id, cohort_id, model_id, family_id, release_id, benchmark_config_model_id
FROM agents
WHERE family_id IS NULL
   OR release_id IS NULL
   OR benchmark_config_model_id IS NULL
ORDER BY created_at DESC;
```

Both queries should return zero rows. Any result indicates the frozen benchmark lineage was bypassed or corrupted.

### 7.4 Markets Stuck Closed

```sql
SELECT id, polymarket_id, question, close_date, last_updated_at
FROM markets
WHERE status = 'closed'
ORDER BY close_date DESC
LIMIT 50;
```

If rows remain here for too long, inspect resolution logs and retry `/api/cron/check-resolutions`.

### 7.5 Open Positions on Closed Markets

```sql
SELECT p.id, p.agent_id, p.market_id, p.side, p.status, m.status AS market_status
FROM positions p
JOIN markets m ON p.market_id = m.id
WHERE p.status = 'open'
  AND m.status IN ('closed', 'resolved')
ORDER BY m.status, p.opened_at DESC;
```

Some `open` + `closed` rows are expected before resolution. `open` + `resolved` rows should be investigated.

---

## 8. Common Failure Modes

### 8.1 Health Endpoint Shows `environment = error`

Likely causes:

- missing production env vars,
- process started without the correct `.env.local`,
- deployment secret drift.

What to do:

1. inspect actual process env,
2. confirm `OPENROUTER_API_KEY`, `CRON_SECRET`, and `ADMIN_PASSWORD`,
3. restart `forecasterarena.service`,
4. re-check `/api/health`.

### 8.2 Decisions Are Missing After Sunday Run

Likely causes:

- cron did not call the route,
- OpenRouter auth/config failed,
- model requests timed out,
- decision rows are stuck in `__IN_PROGRESS__`.

What to do:

1. inspect logs for `decisions_run_error` and `agent_decision_error`,
2. query in-progress decisions,
3. manually rerun `/api/cron/run-decisions` if the environment is healthy.

### 8.3 Market Stays Closed But Never Resolves

Likely causes:

- Polymarket still has no decisive winner,
- settlement is partially failing and the market is intentionally being left `closed`,
- resolution checks are not running.

What to do:

1. inspect `market_resolution_partial_failure` in `system_logs`,
2. inspect `positions` for that market,
3. rerun `/api/cron/check-resolutions` after the underlying failure is fixed.

### 8.4 Exports Fail

Likely causes:

- invalid date range,
- row cap exceeded,
- temp directory / zip utility failure,
- missing admin session.

What to do:

1. reduce the date window,
2. confirm session auth,
3. check server logs,
4. verify the `zip` executable exists in the runtime environment.

---

## 9. Release / Deployment Validation

After every deploy:

1. `curl /api/health`
2. `curl /api/leaderboard`
3. `curl /api/markets?limit=1`
4. verify one CSS file, one JS chunk, and one font under `/_next/static/*`
   return `200` with the correct content type,
5. verify admin login,
6. run a build-local smoke test if the host permits it,
7. confirm scheduled jobs still include the correct bearer token.

Recommended additional checks after schema-affecting changes:

- verify unique decision rows,
- verify unique weekly cohorts,
- verify snapshot insertion still upserts cleanly.

---

## 10. Developer Notes

This repository’s `tsconfig.json` includes `.next/types/**/*.ts`. In practice that means:

- `npm run build` should succeed before `npm run typecheck` is fully meaningful,
- a failed build can cause `typecheck` to complain about missing generated `.next/types` files.

For local validation, use this order:

1. `npm run check`
2. `npm run test:e2e`
3. `npm run test:e2e:empty` when you need explicit empty-state browser coverage

`npm run check` includes `npm run build:standalone`, which copies and verifies
the static assets required by the production standalone server. If a deploy
uses a manually created release directory, run `npm run prepare:standalone-assets`
and `npm run check:standalone-assets` in that release before switching systemd.

---

## 11. Related Documentation

- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/SECURITY.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/TROUBLESHOOTING.md`
