# Forecaster Arena V2 Rollout Plan

> Historical document: this plan captured the April 2026 v2 rollout state and
> is no longer authoritative production guidance. Use `docs/DEPLOYMENT.md`,
> `docs/OPERATIONS.md`, and `docs/DEPLOYMENT_CHECKLIST.md` for current release
> procedures.

Last updated: 2026-04-22

This plan captures the current production VPS reality and the local v2 release
constraints. Production data is the source of truth; local development databases
are fixtures only.

## Production Baseline

- Host: `178.128.69.150`
- Public domain: `https://forecasterarena.com`
- Runtime: Next.js served by systemd, behind Nginx
- Active release path: `/opt/forecasterarena-release-20260308-161644`
- State path: `/opt/forecasterarena-state`
- Database: `/opt/forecasterarena-state/data/forecaster.db`
- Backups: `/opt/forecasterarena-state/backups`
- Service: `forecasterarena.service`
- App port: `3010`
- Scheduler: `/etc/cron.d/forecasterarena`

The deployed tree is a copied release snapshot, not a git checkout. Future v2
deploys should record the source git SHA in the release artifact or release
notes so production can be traced back to the local repository.

## Risks Found On The VPS

1. Disk pressure
   - Root filesystem reached 98% before old backups and caches were pruned.
   - Daily SQLite backups are roughly 600 MB each.
   - V2 must include a bounded retention policy or off-box backup flow.

2. OpenRouter billing failures
   - Recent Sunday decision runs produced `OpenRouter API error: 402 Payment Required`.
   - V2 launch should not be considered healthy until OpenRouter credit and a
     small model-call smoke test pass.

3. Raw service ports
   - The host firewall was inactive and raw app ports were reachable directly.
   - V2 should bind internal services to localhost and/or enforce host firewall
     rules so Nginx is the only public path.

4. Production data continuity
   - Production has 20 cohorts, thousands of markets, and over a million
     portfolio snapshots.
   - Local SQLite data is not representative and must not replace production.

5. Documentation drift
   - Older docs described PM2, but production uses systemd.
   - Deployment instructions should stay aligned with the real host model.

## V2 Development Priorities

1. Production-readiness work
   - Add or document backup retention.
   - Add a pre-deploy DB integrity and row-count validation script.
   - Add a post-deploy smoke checklist that checks health, leaderboard, markets,
     performance data, cron auth, and recent system logs.

2. Operational correctness
   - Add an admin or CLI-visible warning for OpenRouter billing/auth failures.
   - Make all-`ERROR` decision runs obvious in the public/admin surface.
   - Verify Sunday decision runs do not silently mark cohorts healthy when every
     agent failed.

3. Public product polish
   - Ensure homepage first paint and server-rendered copy match live data.
   - Make current release lineage obvious on model and cohort surfaces.
   - Preserve historical family/release identity when v2 changes the lineup.

4. Secure deployment shape
   - Keep raw app ports private.
   - Keep cron endpoints bearer-protected.
   - Keep `.env.local` owned by the runtime user with mode `600`.

## Release Gate For V2

Do not deploy v2 over production until all of these are true:

- root filesystem has meaningful free space after creating a fresh backup
- latest production backup exists and is restorable in staging
- production DB copy passes `PRAGMA integrity_check`
- staging runs against a copy of production data, not local dev data
- `npm run check` passes locally or in staging
- browser e2e coverage passes for rich and empty data states
- OpenRouter account credit is verified
- raw app ports are blocked or bound to localhost
- systemd service rollback path points to the previous release directory
