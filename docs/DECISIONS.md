# Design Decisions Log

This document records the major product, methodology, and implementation
decisions for Forecaster Arena. It is intended to answer three questions:

1. What did the project choose to do?
2. Why was that choice made?
3. What constraints does that choice impose on operations and future changes?

This file is a living design-history document. Historical entries remain in
place even when later implementation details evolve, but entries should reflect
the current production code unless explicitly marked as superseded.

---

## Current System Snapshot

As of March 6, 2026, the production codebase currently implements:

- Weekly cohort creation at Sunday 00:00 UTC
- One agent per active model per cohort
- Top-500 market selection by Polymarket volume
- Sequential decision execution per cohort to reduce provider contention
- Timestamped portfolio snapshots (10-minute cadence)
- Public, redacted health reporting
- Admin-only bounded CSV+ZIP exports
- Database-level uniqueness for:
  - one model per cohort (`agents`)
  - one weekly cohort start timestamp (`cohorts.started_at`)
  - one decision per agent/cohort/week (`decisions`)

The active model roster in code is:

1. GPT-5.2
2. Gemini 3 Pro
3. Grok 4.1
4. Claude Opus 4.5
5. DeepSeek V3.2
6. Kimi K2
7. Qwen 3

---

## Decision Log

### D001: Weekly Cohort System

- Status: Active
- Decision: The benchmark runs as independent weekly cohorts rather than as one
  continuous portfolio.

Rationale:

- Multiple cohorts provide repeated samples across different market regimes.
- Weekly cohort boundaries are easy to explain publicly and audit internally.
- A cohort can be analyzed independently without mixing capital paths.
- Cohorts that run until all positions resolve avoid arbitrary finalization.

Operational implications:

- Cohort IDs are the primary boundary for most analytics and exports.
- Leaderboards can be aggregated across cohorts or inspected per cohort.
- Operations need clear logic for “current week” detection and deduplication.

---

### D002: One Agent Per Model Per Cohort

- Status: Active
- Decision: Each active model has exactly one agent in each cohort.

Rationale:

- Keeps competition conditions symmetric.
- Prevents duplication or weighting of one provider by extra agent instances.
- Simplifies attribution in leaderboards, charts, and trade history.

Implementation constraints:

- Enforced by `UNIQUE(cohort_id, model_id)` in `agents`.
- Agent creation is safe to rerun because inserts use `INSERT OR IGNORE`.

---

### D003: $10,000 Starting Balance

- Status: Active
- Decision: Each agent starts with `$10,000` in virtual cash.

Rationale:

- Easy to reason about for percentages and dashboard display.
- Large enough to allow portfolio construction across multiple weeks.
- Small enough that position sizing remains meaningful.

Related constraints:

- Minimum bet is `$50`
- Maximum single bet is `25%` of current cash balance

---

### D004: Top-500 Market Selection

- Status: Active
- Decision: LLMs see the top 500 markets by trading volume.

Rationale:

- Volume acts as a rough liquidity filter.
- Keeping the selection bounded controls prompt size and cost.
- A global ranking avoids manual category curation bias.

Trade-offs:

- Models do not see the full Polymarket universe.
- Lower-volume niche markets are intentionally excluded.

---

### D005: Deterministic Prompting

- Status: Active
- Decision: All model calls use temperature `0`.

Rationale:

- Makes weekly decisions reproducible given identical inputs.
- Reduces evaluation noise attributable to sampling randomness.
- Makes debugging malformed responses and regression testing easier.

---

### D006: Decision Action Space = BET / SELL / HOLD

- Status: Active
- Decision: Models are limited to three high-level actions:
  `BET`, `SELL`, and `HOLD`.

Rationale:

- Keeps parsing strict and auditable.
- Maps cleanly to paper-trading portfolio operations.
- Avoids introducing hidden intermediate semantics that are hard to score.

Implementation note:

- Malformed or invalid responses can fall back to a synthetic `HOLD`.
- Trade execution may still fail even when the parsed action is valid.

---

### D007: Confidence Derived From Bet Size

- Status: Active
- Decision: Brier scoring uses implied confidence derived from bet size rather
  than a separately requested probability field.

Rationale:

- Forces sizing and confidence to stay coupled.
- Keeps the protocol smaller and easier to audit.
- Makes the benchmark evaluate practical forecasting decisions, not only
  verbalized probabilities.

Formula:

```text
max_possible_bet = cash_balance * 0.25
implied_confidence = bet_amount / max_possible_bet
```

---

### D008: No Refills Within a Cohort

- Status: Active
- Decision: Agents are not recapitalized mid-cohort.

Rationale:

- Preserves the consequences of poor position sizing and liquidation choices.
- Makes risk management part of benchmark performance.
- Prevents artificial “reset” strategies.

---

### D009: SQLite as the Single-Node Source of Truth

- Status: Active
- Decision: SQLite is used as the operational database.

Rationale:

- The system is single-node and write volume is moderate.
- Backups are simple, fast, and operationally cheap.
- Shipping a self-contained research benchmark matters more than horizontal
  scaling complexity.

Trade-offs:

- Concurrency must be handled carefully in application code.
- Multi-node execution would require a different storage strategy.

---

### D010: OpenRouter as the Unified Model Gateway

- Status: Active
- Decision: All models are accessed through OpenRouter rather than through
  provider-specific integrations.

Rationale:

- One transport surface for all participating models.
- Simplifies usage accounting and operational support.
- Reduces the number of secrets and SDK behaviors the system must manage.

---

### D011: Full Prompt and Response Retention

- Status: Active
- Decision: The system stores the full prompts and model responses for each
  decision row.

Rationale:

- Reproducibility is a core benchmark requirement.
- Prompt-level auditing is necessary for fair comparisons.
- Research users need more than aggregate performance figures.

Operational implications:

- Decision exports can optionally include prompts.
- Storage footprint is intentionally higher than a metrics-only system.

---

### D012: Timestamped Portfolio Snapshots

- Status: Active
- Decision: Portfolio snapshots are stored by timestamp, not by calendar date.

Rationale:

- The public charts operate over intraday ranges (`10M`, `1H`, `1D`) as well as
  longer windows.
- A daily-only snapshot model cannot support accurate portfolio curves.
- Timestamped snapshots preserve operational history for debugging and audits.

Implementation constraints:

- Snapshot uniqueness is `(agent_id, snapshot_timestamp)`.
- Downstream docs and queries must use `snapshot_timestamp`, not `snapshot_date`.

---

### D013: Sequential Weekly Decision Execution

- Status: Active
- Decision: Agents in a cohort are processed sequentially.

Rationale:

- Minimizes provider and gateway rate-limit contention.
- Keeps logs and operational tracing easier to follow.
- Reduces the blast radius of partial failures.

Trade-offs:

- End-to-end weekly runtime is longer than a parallel fan-out design.
- Timeout budgeting must account for the full sequential run.

---

### D014: Database-Level Decision Idempotency

- Status: Active
- Decision: One decision row per `(agent_id, cohort_id, decision_week)` is
  enforced in the database, and weekly decision execution claims that row before
  calling the model.

Rationale:

- Read-before-write checks alone are not safe under overlapping cron runs.
- Duplicate decisions can double-spend cash and invalidate benchmark results.
- Claiming the row before network I/O prevents two workers from executing the
  same agent/week concurrently.

Implementation details:

- `decisions` has a unique index on `(agent_id, cohort_id, decision_week)`.
- The engine writes an in-progress placeholder row, then finalizes it after the
  model response.
- Retryable zero-trade outcomes reuse the same row instead of inserting another.
- Stale in-progress rows can be reclaimed after a timeout window.

---

### D015: Database-Level Weekly Cohort Uniqueness

- Status: Active
- Decision: Weekly cohort creation is keyed by normalized UTC week start and is
  uniqueness-constrained at the database layer.

Rationale:

- Cron drift or operator-triggered retries should not create two cohorts for the
  same Sunday window.
- A sequential `cohort_number` alone does not prevent duplicate weekly starts.

Implementation details:

- Week start is normalized to Sunday `00:00:00.000Z`.
- `cohorts.started_at` is unique.
- Cohort creation re-checks within an immediate transaction.

---

### D016: Resolve Markets Only After Successful Settlement

- Status: Active
- Decision: A market is marked locally resolved only after all position
  settlements for that market complete successfully.

Rationale:

- Marking a market resolved too early can strand open positions permanently,
  because later runs may skip it as already processed.
- Settlement safety is more important than optimistic status transitions.

Implementation details:

- Resolution checks still detect an upstream resolved market first.
- The system settles positions, records scoring, and only then updates the local
  `markets.status = 'resolved'`.
- Partial settlement failure leaves the market locally `closed`, making the next
  resolution pass retryable.

---

### D017: Redacted Public Health Reporting

- Status: Active
- Decision: The public health endpoint reports subsystem status without
  disclosing exact missing secret names or raw internal exception text.

Rationale:

- Health endpoints are useful operationally but are often internet-exposed.
- Exact secret names and detailed exception text add low-value disclosure risk.
- External monitors only need component-level health, not sensitive internals.

Implementation notes:

- `environment.message` now says configuration is incomplete instead of listing
  variable names.
- Database and integrity failures return generic labels such as
  `Database unavailable` or `Integrity issues detected`.

---

### D018: Bounded, Admin-Only Exports

- Status: Active
- Decision: Admin exports are intentionally bounded by cohort, time window, and
  per-table row caps, and are packaged without shell interpolation.

Rationale:

- Research exports should be available, but not as an unrestricted data dump.
- Bounded exports keep server resource use predictable.
- Shell-based ZIP command construction created avoidable injection risk.

Implementation details:

- Max export window: 7 days
- Max rows per exported table: 50,000
- Files are written to a temp directory, zipped with argv-based invocation, and
  stored under `backups/exports`
- Export archives are cleaned up after approximately 24 hours

---

### D019: Truthful Empty-State UX

- Status: Active
- Decision: The public UI should distinguish between:
  - a live benchmark with real cohort data,
  - a synced-but-not-yet-trading preview,
  - and a system still awaiting the first cohort or market sync.

Rationale:

- Hardcoded “live” claims are misleading before data exists.
- Research credibility depends on the UI accurately reflecting operational state.

Implementation notes:

- The home page status badge is runtime-aware.
- The home page no longer hardcodes synced-market counts in empty states.
- The models page still renders all seven competitors even before the first live
  leaderboard exists.

---

## Superseded or Clarified Assumptions

### S001: Daily Snapshots

- Status: Superseded
- Original assumption: portfolio snapshots were effectively daily.
- Current reality: snapshots are timestamped and intended for 10-minute cadence.

### S002: Health Endpoint as a Detailed Diagnostic Surface

- Status: Clarified
- Original assumption: public health responses could safely expose exact missing
  secret names or raw database errors.
- Current reality: health remains operationally useful, but intentionally
  redacts sensitive implementation details.

---

## Future Decision Areas

The following areas remain open for future design decisions:

- Whether to move from sequential to queued/background decision execution
- Whether to split public health and private diagnostics into separate endpoints
- Whether to add first-class migrations rather than schema-on-start
- Whether to support historical benchmark versions with model roster versioning
- Whether to provide signed export URLs instead of session-gated downloads

