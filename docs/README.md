# Docs Index

Current docs should be dense, operational, and tied to code that exists now.
Historical plans/audits belong in git history unless they are still needed for
active audit or migration work.

## Canonical Docs

| File | Use it for |
|---|---|
| [`../README.md`](../README.md) | project overview, setup, verification, cron summary |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | layering rules and architecture checks |
| [`METHODOLOGY_v2.md`](./METHODOLOGY_v2.md) | public v2 evaluation protocol |
| [`API_REFERENCE.md`](./API_REFERENCE.md) | route contracts and auth/cache behavior |
| [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | tables, constraints, migrations, invariants |
| [`OPERATIONS.md`](./OPERATIONS.md) | production runbook and VPS procedures |
| [`SECURITY.md`](./SECURITY.md) | trust boundaries, auth, redaction, export safety |

## Keep Only If Needed

These are useful when changing the specific subsystem, but should not become
general narrative docs:

- [`SCORING.md`](./SCORING.md): P&L math and historical diagnostics.
- [`ACCOUNTING_STATES.md`](./ACCOUNTING_STATES.md): position/market edge cases.
- [`PROMPT_DESIGN.md`](./PROMPT_DESIGN.md): prompt behavior not obvious from code.
- [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md): release-window checklist.
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md): quick failure triage.

## Prune Policy

- If a doc restates code without adding operational judgment, delete it.
- If a doc is historical and not linked by the product or an active runbook,
  rely on git history instead of keeping a markdown artifact.
- If a doc contradicts code, fix it or remove it in the same change.
- Do not add new docs unless they replace more ambiguity than they create.
