# Deployment Guide

This guide documents a production-style deployment of Forecaster Arena on a
single Linux host. It is intentionally opinionated around the current codebase:

- Next.js 14 application
- SQLite primary database
- systemd process manager
- Nginx reverse proxy
- cron-triggered internal endpoints

The document assumes you want a durable single-node deployment rather than a
container-orchestrated multi-node system.

---

## 1. Deployment Model

Forecaster Arena is currently designed for:

- one application server
- one SQLite database file on local disk
- one background scheduler source (cron)

This is the architecture the code supports most directly today. If you plan to
deploy multiple app instances behind a load balancer, you should revisit the
database and scheduler assumptions first.

---

## 2. Prerequisites

You need:

- a Linux VPS or dedicated host
- Node.js 20+
- `git`
- `build-essential` or equivalent native build tooling
- `zip` (required for admin exports)
- a valid OpenRouter API key
- TLS termination via Nginx or another reverse proxy

Recommended minimum host shape:

- 2 GB RAM
- 1 vCPU
- SSD-backed disk

For longer benchmark operation and frequent exports/backups, 4 GB RAM and more
disk headroom are preferable.

---

## 3. Required Environment Variables

Create `.env.local` with at least:

```env
OPENROUTER_API_KEY=sk-or-...
CRON_SECRET=replace-with-long-random-secret
ADMIN_PASSWORD=replace-with-strong-password
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_GITHUB_URL=https://github.com/setrf/forecasterarena
```

Optional variables:

```env
DATABASE_PATH=/opt/forecasterarena-state/data/forecaster.db
BACKUP_PATH=/opt/forecasterarena-state/backups
BACKUP_RETENTION_COUNT=7
DECISION_COHORT_LIMIT=5
```

Notes:

- In production, missing `CRON_SECRET` or `ADMIN_PASSWORD` fail closed.
- The build/start path logs warnings when required secrets are missing.
- The public `/api/health` endpoint now redacts exact missing secret names.

---

## 4. Build and Release Flow

Recommended release flow on the server:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
npm ci
npm run check
npm run test:e2e
# run npm run test:e2e:empty as well when the release touches
# empty-state or other browser-visible behavior
```

Important implementation detail:

- `tsconfig.json` includes `.next/types/**/*.ts`
- `npm run typecheck` should therefore be run after a successful `npm run build`
  so Next’s generated route/page type files exist

If you run typecheck before build on a fresh checkout, TypeScript may fail on
missing `.next/types` files even when source code is valid.

---

## 5. Suggested Filesystem Layout

Example layout:

```text
/opt/forecasterarena/
  app/                 # git checkout
  data/                # sqlite database
  backups/             # sqlite backups + exports
  logs/                # cron logs
```

The current production VPS instead uses release and state directories:

```text
/opt/forecasterarena-release-<timestamp>/   # immutable app release snapshot
/opt/forecasterarena-state/data/            # sqlite database
/opt/forecasterarena-state/backups/         # sqlite backups
/var/log/forecaster-arena/                  # cron logs
```

Permissions:

- app directory readable by deploy user
- `.env.local` set to `600`
- database and backup directories writable by the runtime user

---

## 6. systemd Setup

The current production VPS runs Forecaster Arena through a native systemd unit,
not PM2. A release directory can be swapped by changing the unit working
directory or by using a drop-in override.

Example `/etc/systemd/system/forecasterarena.service`:

```ini
[Unit]
Description=Forecaster Arena web application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/forecasterarena-release-current
Environment=NODE_ENV=production
Environment=PORT=3010
EnvironmentFile=/opt/forecasterarena-release-current/.env.local
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Start and persist the service:

```bash
systemctl daemon-reload
systemctl enable --now forecasterarena
```

Operational note:

- `npm run start` serves the built app
- if you rotate releases by symlink or directory swap, ensure the service
  `WorkingDirectory` and `EnvironmentFile` point to the active build directory
- prefer binding the app to `127.0.0.1:3010` or using host firewall rules so
  Nginx is the only public entrypoint

---

## 7. Nginx Setup

Example reverse-proxy config:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then add TLS with Let’s Encrypt or your preferred certificate workflow.

---

## 8. Cron Schedule

The codebase exposes the following internal cron routes:

- `/api/cron/sync-markets`
- `/api/cron/start-cohort`
- `/api/cron/run-decisions`
- `/api/cron/check-resolutions`
- `/api/cron/take-snapshots`
- `/api/cron/check-model-lineup`
- `/api/cron/backup`

All require:

```http
Authorization: Bearer {CRON_SECRET}
```

Recommended schedule:

```cron
# Sync markets every 5 minutes
*/5 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/sync-markets \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/sync.log 2>&1

# Start a new cohort every Sunday at 00:00 UTC
0 0 * * 0 curl -s -X POST http://127.0.0.1:3010/api/cron/start-cohort \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/cohort.log 2>&1

# Run weekly decisions every Sunday at 00:05 UTC
5 0 * * 0 curl -s -X POST http://127.0.0.1:3010/api/cron/run-decisions \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/decisions.log 2>&1

# Check resolutions hourly
0 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/check-resolutions \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/resolutions.log 2>&1

# Take snapshots every 10 minutes
*/10 * * * * curl -s -X POST http://127.0.0.1:3010/api/cron/take-snapshots \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/snapshots.log 2>&1

# Check OpenRouter for newer general-purpose benchmark candidates every Monday
0 9 * * 1 curl -s -X POST http://127.0.0.1:3010/api/cron/check-model-lineup \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/model-lineup.log 2>&1

# Create a daily database backup
0 2 * * * curl -s -X POST http://127.0.0.1:3010/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/forecaster-arena/backup.log 2>&1
```

Why this schedule works with the current code:

- market sync runs frequently enough to keep the local market set fresh
- start-cohort and run-decisions are ordered
- decision execution is sequential, so giving it a dedicated weekly slot matters
- snapshots are timestamp-based and intended for 10-minute cadence
- model-lineup checks are read-only catalog scans; admins approve future defaults separately
- backup retention must be enforced externally or in code so daily SQLite
  backups do not fill the root filesystem

---

## 9. Runtime Expectations

### 9.1 Decision runtime budgeting

The current decision route exports `maxDuration = 600`.

Supporting constraints in code:

- individual OpenRouter call timeout: `40s`
- malformed-response retry limit inside decision parsing: `1`
- OpenRouter transport retry default: `0`
- agents are processed sequentially

That budget was chosen so a normal seven-model run can finish within a
10-minute serverless/route cap rather than allowing one single provider call to
consume the entire window.

### 9.2 Health semantics

`/api/health` returns:

- `200` when all checks are `ok`
- `503` when one or more checks are degraded

The payload is intentionally safe for public exposure:

- exact missing secret names are redacted
- raw DB exception text is redacted
- integrity-check failures are summarized rather than dumped verbatim

### 9.3 Export semantics

Admin exports:

- require an authenticated admin session
- are capped to a 7-day window
- are capped at 50,000 rows per table
- are written to `backups/exports`
- are automatically cleaned up after roughly 24 hours

---

## 10. Post-Deploy Verification

After deploying, verify:

```bash
curl -s http://127.0.0.1:3010/api/health | jq
curl -s http://127.0.0.1:3010/api/leaderboard | jq '.updated_at'
curl -s "http://127.0.0.1:3010/api/markets?limit=1" | jq '.stats'
```

Admin flow checks:

- admin login succeeds with the configured password
- `/api/admin/stats` returns `401` when unauthenticated
- `/api/admin/export` creates and downloads an archive as expected

Cron flow checks:

- cron endpoints reject calls without valid bearer auth
- sync-markets writes new timestamps/log entries
- start-cohort is idempotent for the current week
- run-decisions produces one decision row per agent/week

Database checks:

```bash
sqlite3 /opt/forecasterarena-state/data/forecaster.db "PRAGMA integrity_check;"
sqlite3 /opt/forecasterarena-state/data/forecaster.db "SELECT COUNT(*) FROM cohorts;"
sqlite3 /opt/forecasterarena-state/data/forecaster.db "SELECT COUNT(*) FROM decisions;"
```

---

## 11. Upgrade Procedure

For a normal code upgrade on the current release-snapshot deployment model:

```bash
release=/opt/forecasterarena-release-$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$release"
# copy or unpack the reviewed release into "$release"
cd "$release"
npm ci
npm run check
npm run test:e2e
install -o www-data -g www-data -m 600 /path/to/prod.env "$release/.env.local"
systemctl edit forecasterarena
systemctl restart forecasterarena
```

If the new build succeeds but runtime looks wrong:

1. inspect `journalctl -u forecasterarena`
2. hit `/api/health`
3. verify standalone assets are present:
   `npm run check:standalone-assets`
4. verify the deployed server returns static assets:
   `curl -I http://127.0.0.1:3010/_next/static/css/<current-css-file>.css`
5. verify `.env.local`
6. verify cron auth still matches `CRON_SECRET`
7. verify the database path still points to the intended file

For standalone systemd releases, never deploy the raw `next build` output
without also running:

```bash
npm run prepare:standalone-assets
npm run check:standalone-assets
```

The standalone server runs from `.next/standalone`; missing
`.next/standalone/.next/static` will produce an unstyled app even when the
HTML route itself returns `200`.

---

## 12. Rollback Procedure

If a release must be rolled back:

```bash
systemctl edit forecasterarena
systemctl restart forecasterarena
```

Rollback should point the systemd service back to the previous known-good
release directory and leave the production SQLite database in place unless the
incident is explicitly a data problem.

Why rollback uses the narrower service flow:

- the goal is to restore service quickly with a known-good commit
- rerun `npm run check` and browser coverage after service is back if time allows

If the problem is database corruption rather than code:

1. stop the app
2. restore the latest valid SQLite backup
3. restart
4. re-run health and integrity checks

---

## 13. Deployment Risks to Watch

- Missing production secrets will not silently degrade; some routes will fail
  closed and `/api/health` will return `503`
- Because SQLite is the source of truth, disk health and backup discipline
  matter
- Because daily backups can exceed 600 MB each, keep only a bounded retention
  window on the VPS and move longer-term backups off-box
- Because OpenRouter billing failures produce decision rows with `ERROR`,
  verify account credit before the Sunday decision window
- Because old cohorts can stay unresolved for months, `run-decisions` only
  spends LLM calls on the latest decision-eligible cohort window; snapshots
  cover unarchived active cohorts, while resolution settlement remains
  market-wide so archived positions can still settle
- Because decision runs are sequential, provider latency spikes can still affect
  Sunday completion time even with the current timeout budget
- Because cron is the scheduler, host timezone drift or missing jobs will show
  up quickly as stale sync/snapshot data
- Because app ports are only meant for local reverse proxy traffic, firewall
  public access to raw service ports such as `3010`
