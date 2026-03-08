# Forecaster Arena Security Notes

Last updated: 2026-03-07

This document describes the security posture implemented in the repository today. It is intentionally concrete: it describes what the code actually does, where the trust boundaries are, and which limitations still exist.

---

## 1. Threat Model

Forecaster Arena is not a consumer-facing financial product. It is a research benchmark that:

- does not custody funds,
- does not execute real trades,
- does not maintain end-user accounts,
- does not store PII beyond a transient admin session cookie,
- does store operational secrets and benchmark internals.

The main security goals are therefore:

1. protect cron mutation routes from unauthorized callers,
2. protect the admin surface from unauthorized callers,
3. avoid accidental leakage of secrets or raw internal failure details,
4. preserve benchmark data integrity under retries or overlapping jobs,
5. keep filesystem export/backup paths from becoming command-injection or traversal surfaces.

---

## 2. Sensitive Assets

Primary sensitive assets:

- `OPENROUTER_API_KEY`
- `CRON_SECRET`
- `ADMIN_PASSWORD`
- the SQLite database file and backups
- exported ZIP archives produced by the admin export route
- full decision prompts/responses stored for reproducibility

Even though the benchmark data is not financial, prompt/response history and admin routes still deserve protection because they enable operational control and internal analysis.

---

## 3. Authentication Model

### 3.1 Cron Authentication

Implemented in:

- `lib/api/cron-auth.ts`
- `middleware.ts`
- all `app/api/cron/*` route handlers

Current behavior:

- Cron routes require `Authorization: Bearer <CRON_SECRET>`.
- Comparison uses constant-time comparison.
- In production, missing `CRON_SECRET` causes authorization to fail closed.

Implications:

- A caller without the bearer token cannot start cohorts, run decisions, sync markets, take snapshots, trigger backups, or run resolution checks.
- Operational correctness still depends on the deployment using an actual strong secret.

### 3.2 Admin Authentication

Implemented in:

- `app/api/admin/login/route.ts`
- `lib/auth.ts`
- `lib/api/admin-route.ts`

Current behavior:

- Login is password-only.
- Session cookie name: `forecaster_admin`
- Cookie settings:
  - `httpOnly: true`
  - `secure: true` in production
  - `sameSite: 'lax'`
  - `path: '/'`
  - `maxAge: 7 days`
- Cookie contents are base64-encoded `admin:<timestamp>:<hmac>` data.
- HMAC key is `ADMIN_PASSWORD`.
- Session validation also checks age.

Security consequences:

- A password rotation invalidates existing sessions.
- Session validation is stateless and server-side verifiable.
- In production, missing `ADMIN_PASSWORD` disables admin login and validation.

---

## 4. Rate Limiting

Implemented in `middleware.ts`.

Current limits:

- `POST /api/admin/login`: 5 requests per minute per IP in middleware
- `POST /api/cron/*`: 10 requests per minute per IP
- non-login `GET/POST /api/admin/*`: 30 requests per minute per IP

Current limitation:

- The limiter is in-memory and per-process only.
- It is not suitable as a distributed or multi-instance protection layer.
- IP extraction depends on proxy headers, so deployment trust boundaries matter.

This is acceptable for the current single-instance architecture, but should not be described as robust distributed abuse protection.

---

## 5. Secret Handling

### Required Production Secrets

| Secret | Used for | Fail-closed behavior |
|--------|----------|----------------------|
| `OPENROUTER_API_KEY` | OpenRouter requests | Decision/model calls fail |
| `CRON_SECRET` | Cron route auth | Cron routes reject requests |
| `ADMIN_PASSWORD` | Admin login + session signing | Admin auth is unavailable |

### Current Runtime Warning Behavior

`lib/constants.ts` emits server-side warnings in production when secrets are missing.

Important nuance:

- those warnings are useful operationally,
- they do not appear in the public health response,
- they can appear multiple times during build/start because different build/runtime processes evaluate the module independently.

---

## 6. Public Health Endpoint

`GET /api/health` is intentionally public.

Current security posture:

- It reports only subsystem-level status:
  - `database`
  - `environment`
  - `data_integrity`
- It does **not** expose:
  - exact missing secret names,
  - raw database exception text,
  - raw integrity failure internals.

Current redacted messages include:

- `Database unavailable`
- `Required configuration is incomplete`
- `Integrity check unavailable`
- `Integrity issues detected`

This is a deliberate tradeoff:

- enough detail for uptime and monitoring systems,
- not enough detail to leak configuration names or internal exception strings to unauthenticated callers.

---

## 7. Export Route Hardening

`POST /api/admin/export` is one of the more sensitive routes because it crosses from database records into temporary filesystem artifacts.

Current protections:

1. Admin authentication is required.
2. Export filenames are sanitized to alphanumeric characters, `_`, and `-`.
3. Archive creation uses `spawnSync('zip', ['-j', ...])` with argv, not shell-interpolated command strings.
4. Export archives are written beneath the app-owned export directory.
5. Downloads use `path.basename(...)` before joining to the export directory.
6. Old ZIP exports are cleaned up automatically after about 24 hours.
7. The route caps:
   - export window to 7 days,
   - each table to 50,000 rows.

Security outcome:

- the previous shell-injection class of bug is addressed,
- the filename/path surface is materially safer,
- exports remain bounded enough to be operationally reasonable.

Operational note:

- the route still relies on the `zip` binary existing in the server environment.

---

## 8. Data Integrity as a Security Property

For this application, integrity is as important as confidentiality.

Recent hardening in the codebase now protects the benchmark from duplicate or partially-applied mutation flows.

### 8.1 Weekly Cohort Uniqueness

The database now enforces week uniqueness via a unique index on `cohorts.started_at`.

Current behavior:

- `createCohort()` normalizes to the current week start (Sunday 00:00 UTC),
- concurrent callers resolve to the same weekly cohort,
- cohort creation now requires a frozen `benchmark_config_id`,
- agent creation is physically idempotent through `INSERT OR IGNORE` plus the frozen slot key `(cohort_id, benchmark_config_model_id)`,
- each persisted agent is also required to carry frozen `family_id`, `release_id`, and `benchmark_config_model_id`.

Why it matters:

- overlapping cron triggers should not create multiple cohorts for the same week,
- the benchmark must preserve one canonical weekly competition instance.

### 8.2 Decision Claiming

The database now enforces one canonical decision row per `(agent_id, cohort_id, decision_week)`.

Current flow:

1. Claim the row before making the model call.
2. Mark it as in progress using a reserved placeholder state:
   - `action = 'ERROR'`
   - `error_message = '__IN_PROGRESS__'`
3. Replace placeholder data with the finalized decision once the model returns.
4. Mark the row as `ERROR` with a real message if processing fails.

Why it matters:

- overlapping decision runs no longer produce duplicate rows and duplicate trades,
- retries reclaim the same logical decision row instead of appending a second row,
- stale in-progress placeholders can be safely reclaimed later.

### 8.3 Resolution Ordering

Resolution now follows this order:

1. detect the winner,
2. settle all open positions,
3. only after that succeeds, mark the market `resolved`.

Why it matters:

- a partial settlement failure no longer strands open positions under a market already marked resolved,
- the next resolution pass can retry safely because the market remains `closed` until the local write set is complete.

---

## 9. Database and Filesystem Exposure

### SQLite

Current realities:

- SQLite is writable by the app process,
- backups are filesystem-level artifacts,
- there is no database-level user isolation or at-rest encryption by default.

This is acceptable for the current deployment model, but operators should treat:

- `data/forecaster.db`
- `backups/`
- `backups/exports/`

as sensitive operational assets.

### Backups and Exports

Backups:

- created through the SQLite backup API,
- stored on local disk by default.

Exports:

- created from selected tables,
- cleaned more aggressively than database backups,
- intended as short-lived operational artifacts.

---

## 10. What the Public Site Intentionally Does Not Reveal

Public pages and public APIs are now more careful about not overstating or overexposing the system state.

Examples:

- Empty-state UI no longer hardcodes a live synced market count when the database is empty.
- The public health endpoint no longer reveals exact missing environment variable names.
- Admin export filenames no longer preserve arbitrary raw user input.

These are not just UX improvements; they reduce information leakage and misrepresentation.

---

## 11. Remaining Security Limitations

These are still real and should be documented honestly.

### 11.1 In-Memory Rate Limiting

- single-process only,
- resets on restart,
- not shared across instances.

### 11.2 Trusted Header Assumptions

Both middleware and login flows derive client IP from proxy headers such as:

- `cf-connecting-ip`
- `x-real-ip`
- `x-forwarded-for`

This is acceptable only when the deployment stack controls those headers.

### 11.3 Single-Admin Model

The admin surface is designed around one password and one admin role, not multi-user RBAC.

### 11.4 No Secret Vault Integration

Secrets are environment-driven. There is no first-class KMS/secret-manager integration in the repository itself.

### 11.5 External Binary Dependency for ZIP Exports

The export route now invokes `zip` safely, but still assumes the binary is installed and callable.

---

## 12. Production Security Checklist

Before production:

- [ ] Set strong `OPENROUTER_API_KEY`
- [ ] Set strong `CRON_SECRET`
- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Verify `.env.local` is not committed
- [ ] Verify the process can read only the intended env file
- [ ] Verify `zip` exists if admin export will be used
- [ ] Verify the SQLite database path and backup path are writable by the app process

After deployment:

- [ ] `GET /api/health` returns no leaked secret names
- [ ] Cron routes return `401` without bearer token
- [ ] Admin login rejects bad passwords and sets `forecaster_admin` cookie on success
- [ ] Export route can generate and download a ZIP artifact
- [ ] No duplicate weekly cohorts exist
- [ ] No duplicate per-week decisions exist

Ongoing:

- [ ] Review `system_logs` regularly
- [ ] Rotate `CRON_SECRET` and `ADMIN_PASSWORD` when needed
- [ ] Audit backup/export directories for retention and permissions
- [ ] Re-check rate limiting assumptions if moving beyond a single instance

---

## 13. Related Files

Primary code references:

- `app/api/admin/export/route.ts`
- `app/api/admin/login/route.ts`
- `app/api/health/route.ts`
- `lib/api/cron-auth.ts`
- `lib/auth.ts`
- `middleware.ts`
- `lib/db/queries/cohorts.ts`
- `lib/db/queries/decisions.ts`
- `lib/engine/decision.ts`
- `lib/engine/resolution.ts`
- `lib/db/schema.ts`
