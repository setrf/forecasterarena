# Documentation Index

Last updated: 2026-03-07

This directory contains both:

1. **authoritative current-reference documentation**, and
2. **historical analysis / audit notes**

If you want the current system-of-record, start with the files in the first
section below.

---

## Current Reference Docs

These files are intended to match the codebase as it exists today:

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
  - top-level layering rules, import boundaries, and browser QA expectations
- [`README.md`](../README.md)
  - top-level project overview, runtime guarantees, current model roster,
    environment setup, and route summary
- [`API_REFERENCE.md`](./API_REFERENCE.md)
  - detailed contract-level route documentation
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
  - detailed runtime architecture, engine flow, and invariants
- [`OPERATIONS.md`](./OPERATIONS.md)
  - production runbook and operational checks
- [`SECURITY.md`](./SECURITY.md)
  - current auth, redaction, integrity, and export hardening behavior
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)
  - implementation-aligned schema and index reference
- [`METHODOLOGY_v1.md`](./METHODOLOGY_v1.md)
  - benchmark methodology specification
- [`DECISIONS.md`](./DECISIONS.md)
  - design-decision log for the current implementation
- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
  - deployment guide
- [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)
  - pre/post deploy checklist
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)
  - operational troubleshooting guide
- [`SCORING.md`](./SCORING.md)
  - metric-specific scoring details
- [`ACCOUNTING_STATES.md`](./ACCOUNTING_STATES.md)
  - position/accounting edge-case explanations
- [`PROMPT_DESIGN.md`](./PROMPT_DESIGN.md)
  - prompt-construction notes

---

## Historical / Archival Docs

These files are useful for context, but they are **not** the authoritative
description of current behavior:

- [`AUDIT_REPORT_2025-12-14.md`](./AUDIT_REPORT_2025-12-14.md)
- [`AUDIT_SUMMARY.md`](./AUDIT_SUMMARY.md)
- [`CODE_IMPROVEMENTS.md`](./CODE_IMPROVEMENTS.md)
- [`MULTI_COHORT_AGGREGATION_ANALYSIS.md`](./MULTI_COHORT_AGGREGATION_ANALYSIS.md)
- [`MULTI_COHORT_FIXES_2025-12-14.md`](./MULTI_COHORT_FIXES_2025-12-14.md)

Use these for historical reasoning, not for present-day operational guidance.

---

## Supporting Materials

These directories are useful for presentations or historical launch context, but
they are not the system-of-record for current runtime behavior:

- [`../launch`](../launch)
  - historical launch copy, outreach drafts, and launch-day checklists
- [`../presentation`](../presentation)
  - optional slide deck assets and PDF-export instructions
