# Troubleshooting

Short operational triage for the current single-node deployment: Next.js under
systemd, SQLite, cron-triggered internal endpoints, OpenRouter decisions, and
10-minute portfolio snapshots.

---

## 1. Fast Triage

Start with these checks:

```bash
systemctl status forecasterarena --no-pager
journalctl -u forecasterarena --no-pager -n 100
curl -s https://yourdomain.example/api/health | jq
sqlite3 /path/to/forecaster.db "PRAGMA integrity_check;"
```

Interpretation:

- systemd unhealthy: app startup/runtime issue
- `/api/health` degraded: config, DB, or integrity issue
- integrity check fails: stop and investigate before continuing writes

Important note about `/api/health`:

- the endpoint intentionally redacts exact secret names and raw internal error
  text
- use server logs and local config inspection for root-cause detail

---

## 2. Build and Typecheck Failures

### Symptom

- `npm run typecheck` fails on missing `.next/types/...` files

### Cause

The project includes generated Next route/page types in TypeScript input, so a
fresh checkout may need a successful build first.

### Fix

```bash
npm ci
npm run build
npm run typecheck
```

If `npm run build` fails first, fix the build error before expecting
typecheck to work.

---

## 3. App Will Not Start

### Symptoms

- `forecasterarena.service` is failed or restart-looping
- reverse proxy returns `502`
- startup logs stop immediately

### Checks

```bash
journalctl -u forecasterarena --no-pager -n 200
printenv | rg 'OPENROUTER_API_KEY|CRON_SECRET|ADMIN_PASSWORD|DATABASE_PATH|BACKUP_PATH'
ls -l .env.local
```

### Common causes

#### Missing production secrets

Expected behavior in production:

- cron auth fails closed if `CRON_SECRET` is missing
- admin auth fails closed if `ADMIN_PASSWORD` is missing
- OpenRouter-dependent operations fail if `OPENROUTER_API_KEY` is missing

#### Missing `zip`

Admin export creation uses `zip`. If it is not installed:

- normal app pages still work
- admin export requests fail

Fix:

```bash
sudo apt-get install -y zip
```

#### DB path or permissions wrong

Check:

```bash
ls -ld data backups
ls -l data/forecaster.db
```

---

## 4. Health Endpoint Returns 503

### Meaning

At least one of:

- database check failed
- required config is incomplete
- integrity issues were detected

### Example degraded response

```json
{
  "status": "error",
  "checks": {
    "database": { "status": "ok" },
    "environment": {
      "status": "error",
      "message": "Required configuration is incomplete"
    },
    "data_integrity": { "status": "ok" }
  }
}
```

### Next steps

1. inspect app logs for startup warnings
2. verify `.env.local`
3. verify DB access
4. run `PRAGMA integrity_check;`

If you need the exact missing secrets, inspect local env/config directly instead
of expecting `/api/health` to reveal them.

---

## 5. Cron Jobs Are Not Running

### Symptoms

- markets stop updating
- no Sunday decisions are created
- snapshot charts stay flat or stale

### Checks

```bash
crontab -l
tail -n 100 /var/log/forecaster-arena/sync.log
tail -n 100 /var/log/forecaster-arena/decisions.log
tail -n 100 /var/log/forecaster-arena/snapshots.log
```

### Manual auth test

```bash
curl -i -X POST http://127.0.0.1:3010/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Common causes

#### Wrong `CRON_SECRET`

Symptom:

- cron routes return `401`

Fix:

- verify the secret in cron exactly matches the app runtime secret

#### Host timezone confusion

The schedule is written assuming UTC. Verify:

```bash
timedatectl
```

If you do not want the host on UTC, ensure the cron expressions account for the
host timezone.

#### Cron exists but points to wrong port

If systemd runs the app on `3010` but cron targets `3000`, jobs will silently
miss the live service.

---

## 6. Weekly Decisions Did Not Complete

### Symptoms

- fewer than expected decisions for the weekly run
- no new trades on Sunday
- run-decisions route times out

### Current runtime characteristics

- route budget: 10 minutes
- per-model network timeout: 40 seconds
- malformed response retry limit: 1
- OpenRouter transport retry default: 0
- models processed sequentially

### Checks

```bash
sqlite3 /path/to/forecaster.db \
  "SELECT cohort_id, agent_id, decision_week, action, error_message, decision_timestamp FROM decisions ORDER BY decision_timestamp DESC LIMIT 20;"
```

### What “in progress” means

The decision engine now claims a unique weekly decision row before making the
model call. This prevents duplicate runs from double-executing the same agent.

If a run dies mid-flight:

- an in-progress row may exist for that `(agent, cohort, week)`
- stale in-progress rows are reclaimable by later runs

### Recovery approach

1. inspect the latest decision rows
2. inspect systemd logs for provider or timeout errors
3. rerun `/api/cron/run-decisions` manually with valid auth if needed

Because the row is claimed before execution, reruns should reuse the same
decision record instead of inserting duplicates.

---

## 7. A Market Is Resolved Upstream But Still Closed Locally

### This can be expected

The system now intentionally leaves a market locally `closed` if any position
settlement fails during resolution processing.

Why:

- marking it `resolved` too early could strand open positions permanently
- leaving it `closed` allows the next resolution pass to retry settlement

### Checks

```bash
sqlite3 /path/to/forecaster.db \
  "SELECT id, polymarket_id, status, resolution_outcome, resolved_at FROM markets WHERE status='closed' ORDER BY close_date DESC LIMIT 20;"
```

Then inspect recent error logs:

```bash
sqlite3 /path/to/forecaster.db \
  "SELECT event_type, event_data, created_at FROM system_logs WHERE severity='error' ORDER BY created_at DESC LIMIT 20;"
```

---

## 8. Duplicate Weekly Cohorts or Decisions

### Expected current behavior

The current code enforces uniqueness for:

- one cohort per normalized weekly `started_at`
- one decision per `(agent_id, cohort_id, decision_week)`

### If a uniqueness error appears

It usually means historical DB state predates the current constraints or was
manually modified.

Investigate:

```bash
sqlite3 /path/to/forecaster.db \
  "SELECT started_at, COUNT(*) FROM cohorts GROUP BY started_at HAVING COUNT(*) > 1;"

sqlite3 /path/to/forecaster.db \
  "SELECT agent_id, cohort_id, decision_week, COUNT(*) FROM decisions GROUP BY agent_id, cohort_id, decision_week HAVING COUNT(*) > 1;"
```

Resolve duplicates before continuing normal operation.

---

## 9. Export Fails

### Symptoms

- admin export request returns `500`
- archive is not downloadable
- export succeeds for tiny windows but fails for larger ones

### Current export limits

- requires authenticated admin session
- max date window: 7 days
- max rows per table: 50,000
- cleanup window: about 24 hours

### Checks

```bash
ls -l backups/exports
which zip
```

### Common causes

#### Missing `zip`

Install it:

```bash
sudo apt-get install -y zip
```

#### Window too large

The route rejects overly large requests by design. Narrow the date range or
request fewer tables.

#### Export expired

Archives are cleaned up automatically, so a previously issued download URL may
return `404` after cleanup.

---

## 10. Charts Are Empty or Misleading

### Home page

The homepage now distinguishes:

- `Live Benchmark`
- `Synced Preview`
- `Awaiting First Cohort`

If the site shows an awaiting/synced preview state, check whether:

- any cohorts exist
- any markets exist
- snapshots exist

### Performance API

Check:

```bash
curl -s "https://yourdomain.example/api/performance-data?range=1M" | jq
```

Supported ranges:

- `10M`
- `1H`
- `1D`
- `1W`
- `1M`
- `3M`
- `ALL`

If the response is empty, the likely causes are:

- no snapshots yet
- snapshots outside the requested range
- wrong `cohort_id`

---

## 11. Markets Page Looks Empty

Check the underlying API:

```bash
curl -s "https://yourdomain.example/api/markets?limit=1" | jq
```

Look at:

- `total`
- `stats.total_markets`
- `stats.active_markets`

If these are zero:

- market sync has not run yet
- or sync is failing

If totals are non-zero but the UI still looks sparse, inspect filters:

- `status`
- `category`
- `search`
- `cohort_bets`

---

## 12. Database Integrity or Locking Problems

### Checks

```bash
sqlite3 /path/to/forecaster.db "PRAGMA integrity_check;"
lsof /path/to/forecaster.db
df -h
```

### Common causes

- disk full
- wrong permissions
- unexpected extra process touching the DB

### Recovery

If integrity fails:

1. stop the app
2. back up the broken DB file
3. restore the latest good backup
4. re-run integrity and health checks

---

## 13. Recommended Escalation Order

When something is wrong:

1. check `forecasterarena.service` health
2. hit `/api/health`
3. inspect app logs
4. inspect DB integrity
5. inspect `system_logs`
6. manually hit the failing endpoint with the expected auth
7. only then restart cron/app services if the root cause still points there
