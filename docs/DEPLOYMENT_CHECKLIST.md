# Deployment Checklist

Use this checklist before and after deploying Forecaster Arena.

This checklist is intentionally aligned with the current implementation rather
than a generic Next.js app.

---

## 1. Release Readiness

### Source Control

- [ ] Local `main` is current with `origin/main`
- [ ] Working tree is clean
- [ ] Release commit is reviewed

### Build Validation

- [ ] `npm ci` completed successfully
- [ ] `npm run check` passed
- [ ] `npm run test:e2e` passed for seeded rich-state browser coverage
- [ ] `npm run test:e2e:empty` passed or was intentionally skipped because the release does not touch empty-state/browser-visible behavior

### Configuration

- [ ] `OPENROUTER_API_KEY` is configured
- [ ] `CRON_SECRET` is configured and strong
- [ ] `ADMIN_PASSWORD` is configured and strong
- [ ] `NEXT_PUBLIC_SITE_URL` points to the deployment URL
- [ ] Optional `DATABASE_PATH` and `BACKUP_PATH` are correct for the host

### Host Requirements

- [ ] `zip` is installed for admin exports
- [ ] enough disk exists for SQLite, backups, and export archives
- [ ] TLS / reverse proxy configuration is ready

---

## 2. Security Readiness

- [ ] `.env.local` exists and is not committed
- [ ] `.env.local` permissions are restricted
- [ ] cron commands use the same `CRON_SECRET` as the app runtime
- [ ] admin endpoints require login in the target environment
- [ ] cron endpoints return `401` without valid auth
- [ ] `/api/health` has been spot-checked to confirm it does not leak secret names

---

## 3. Database Readiness

- [ ] target database file exists, or first boot creation is expected
- [ ] latest backup exists before deploy
- [ ] `PRAGMA integrity_check` passes on the target database
- [ ] there are no known duplicate weekly cohorts or duplicate per-week
      decisions that would conflict with current uniqueness constraints

Recommended checks:

```bash
sqlite3 /path/to/forecaster.db "PRAGMA integrity_check;"
sqlite3 /path/to/forecaster.db "SELECT COUNT(*) FROM cohorts;"
sqlite3 /path/to/forecaster.db "SELECT COUNT(*) FROM decisions;"
```

---

## 4. Scheduler Readiness

- [ ] `sync-markets` cron is installed
- [ ] `start-cohort` cron is installed
- [ ] `run-decisions` cron is installed
- [ ] `check-resolutions` cron is installed
- [ ] `take-snapshots` cron is installed
- [ ] `backup` cron is installed
- [ ] host timezone and schedule assumptions are understood

Recommended schedule:

- [ ] `*/5 * * * *` sync markets
- [ ] `0 0 * * 0` start cohort
- [ ] `5 0 * * 0` run decisions
- [ ] `0 * * * *` check resolutions
- [ ] `*/10 * * * *` take snapshots
- [ ] `0 23 * * 6` create backup (or another documented low-traffic backup slot)

---

## 5. Post-Deploy Verification

### Application

- [ ] homepage loads
- [ ] models page loads and renders all 7 models
- [ ] markets page loads
- [ ] cohorts page loads
- [ ] admin login page loads

### API

- [ ] `/api/health` returns the expected status for the environment
- [ ] `/api/leaderboard` returns JSON
- [ ] `/api/markets?limit=1` returns JSON
- [ ] `/api/performance-data?range=1M` returns JSON

### Admin

- [ ] login succeeds with the configured password
- [ ] `/api/admin/stats` is blocked when not logged in
- [ ] export creation works for a small cohort/time window

### Cron

- [ ] one cron route was manually exercised successfully
- [ ] cron logs are being written
- [ ] a failed unauthenticated cron call returns `401`

---

## 6. Observability Checks

- [ ] PM2 process is online
- [ ] PM2 logs show no startup crash loop
- [ ] Nginx config tests cleanly
- [ ] Nginx error log is quiet after traffic warm-up
- [ ] system logs table is receiving expected operational events

Suggested commands:

```bash
pm2 status
pm2 logs forecaster-arena --lines 100
sudo nginx -t
sqlite3 /path/to/forecaster.db "SELECT event_type, severity, created_at FROM system_logs ORDER BY created_at DESC LIMIT 20;"
```

---

## 7. First-Week Monitoring

- [ ] market sync timestamps continue advancing
- [ ] snapshots continue landing every 10 minutes
- [ ] Sunday cohort start remains idempotent
- [ ] Sunday decision run creates one weekly decision row per agent
- [ ] resolution checks do not leave growing numbers of stale closed markets
- [ ] backups are actually created on schedule

---

## 8. Rollback Preparedness

- [ ] previous working commit is known
- [ ] latest DB backup path is known
- [ ] rollback command path is documented
- [ ] the operator has verified they can restart PM2 and Nginx if required
