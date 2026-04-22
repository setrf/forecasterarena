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
- [ ] Optional `BACKUP_RETENTION_COUNT` is set intentionally, or the default
      one-week retention is acceptable

### Host Requirements

- [ ] `zip` is installed for admin exports
- [ ] root filesystem has enough free disk for SQLite, WAL growth, backups,
      export archives, and one new release directory
- [ ] backup retention is bounded so daily SQLite backups cannot fill the host
- [ ] TLS / reverse proxy configuration is ready
- [ ] raw app ports are not publicly reachable; Nginx should be the public
      entrypoint for Forecaster Arena

---

## 2. Security Readiness

- [ ] `.env.local` exists and is not committed
- [ ] `.env.local` permissions are restricted
- [ ] cron commands use the same `CRON_SECRET` as the app runtime
- [ ] admin endpoints require login in the target environment
- [ ] cron endpoints return `401` without valid auth
- [ ] `/api/health` has been spot-checked to confirm it does not leak secret names
- [ ] host firewall or service bind addresses prevent direct public access to
      internal app ports such as `3010`

---

## 3. Database Readiness

- [ ] target database file exists, or first boot creation is expected
- [ ] latest full backup exists before deploy
- [ ] backup path has enough free space for the next scheduled backup
- [ ] `PRAGMA integrity_check` passes on the target database
- [ ] there are no known duplicate weekly cohorts or duplicate per-week
      decisions that would conflict with current uniqueness constraints
- [ ] production database is treated as the source of truth; local development
      SQLite files are not copied over production data

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
- [ ] models page loads and renders all active benchmark families
- [ ] markets page loads
- [ ] cohorts page loads
- [ ] admin login page loads

### API

- [ ] `/api/health` returns the expected status for the environment
- [ ] `/api/leaderboard` returns JSON
- [ ] `/api/markets?limit=1` returns JSON
- [ ] `/api/performance-data?range=1M` returns JSON
- [ ] latest system logs do not show recurring OpenRouter billing/auth errors
- [ ] OpenRouter credit has been verified before the next decision run

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

- [ ] `forecasterarena.service` is active under systemd
- [ ] `journalctl -u forecasterarena` shows no startup crash loop
- [ ] Nginx config tests cleanly
- [ ] Nginx error log is quiet after traffic warm-up
- [ ] system logs table is receiving expected operational events

Suggested commands:

```bash
systemctl status forecasterarena --no-pager
journalctl -u forecasterarena --no-pager -n 100
sudo nginx -t
sqlite3 /path/to/forecaster.db "SELECT event_type, severity, created_at FROM system_logs ORDER BY created_at DESC LIMIT 20;"
```

---

## 7. First-Week Monitoring

- [ ] market sync timestamps continue advancing
- [ ] snapshots continue landing every 10 minutes
- [ ] Sunday cohort start remains idempotent
- [ ] Sunday decision run creates one weekly decision row per agent
- [ ] Sunday decision run does not create all-`ERROR` decision rows
- [ ] resolution checks do not leave growing numbers of stale closed markets
- [ ] backups are actually created on schedule
- [ ] old backups are pruned or moved off-box according to the retention policy

---

## 8. Rollback Preparedness

- [ ] previous working commit is known
- [ ] previous release directory is known
- [ ] latest DB backup path is known
- [ ] rollback command path is documented
- [ ] the operator has verified they can restart systemd service and Nginx if required
