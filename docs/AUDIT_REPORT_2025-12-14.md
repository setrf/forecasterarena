# Forecaster Arena - Comprehensive Pre-Cohort Audit Report

**Date**: December 14, 2025
**Auditor**: Automated Code Analysis
**Next Cohort**: Sunday, December 21, 2025 at 00:00 UTC
**Overall Status**: CONDITIONAL GO - Critical fixes required

---

## Executive Summary

A comprehensive audit was conducted covering database integrity, financial calculations, multi-cohort aggregation, transaction safety, and cron reliability. The system is fundamentally sound but has **several critical issues** that must be addressed before the next cohort.

### Risk Matrix

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Database Integrity | 1 (FIXED) | 0 | 0 | 0 |
| Financial Calculations | 2 | 1 | 0 | 0 |
| Multi-Cohort Aggregation | 0 | 1 | 2 | 0 |
| Transaction Safety | 1 | 1 | 1 | 1 |
| Cron Reliability | 3 | 2 | 3 | 2 |

---

## Part 1: Database Integrity

### 1.1 Issues Found and Fixed

**CRITICAL - Index Corruption (FIXED)**
- **Issue**: `idx_markets_close_date` index was corrupted (6 rows missing)
- **Action Taken**: Rebuilt index with `REINDEX idx_markets_close_date`
- **Status**: ✅ RESOLVED - Integrity check now returns "ok"

### 1.2 Data Consistency Verification

| Check | Status | Notes |
|-------|--------|-------|
| Foreign key integrity | ✅ PASS | No orphaned records |
| Cash + invested = $10,000 | ✅ PASS | All 14 agents balance correctly |
| Position costs match invested | ✅ PASS | Zero discrepancy |
| Orphaned positions | ✅ PASS | 0 found |
| Orphaned trades | ✅ PASS | 0 found |
| Orphaned decisions | ✅ PASS | 0 found |

### 1.3 Current Data State

- **Cohorts**: 2 (Cohort 1: Dec 7 active, Cohort 2: Dec 14 active)
- **Markets**: 666 total (526 active, 0 resolved)
- **Positions**: 23 open in Cohort 1, 0 in Cohort 2
- **Decisions**: 39 logged for Cohort 1
- **Backups**: 4 present (Dec 8, 11, 12, 13)

---

## Part 2: Financial Calculations

### 2.1 CRITICAL Issues

**Issue #1: Portfolio Value Fallback Bug**
- **Location**: `/opt/forecasterarena/app/api/cohorts/[id]/models/[modelId]/route.ts:84`
- **Problem**: When no snapshot exists, uses `cash + total_invested` instead of actual position values
- **Impact**: Shows wrong portfolio value (e.g., $10,000 instead of $11,600 with gains)
- **Also affects**: `/app/api/models/[id]/route.ts:72`, `/app/api/cohorts/[id]/route.ts:71`
- **Fix Required**: Query actual position values from database instead of using `total_invested`

**Issue #2: Unresolved Closed Market Price Fallback**
- **Location**: `/opt/forecasterarena/app/api/cron/take-snapshots/route.ts:152-172`
- **Problem**: When market closes but hasn't resolved, defaults to 0.5 if no price available
- **Impact**: Could show phantom $5,000+ values on closed unresolved positions
- **Fix Required**: Use last known price, not 0.5 fallback

### 2.2 HIGH Priority Issues

**Issue #3: Realized P/L Not Tracked Separately**
- **Location**: `/opt/forecasterarena/app/api/cron/take-snapshots/route.ts:196-207`
- **Problem**: Snapshots only track total P/L, not realized vs unrealized
- **Impact**: Cannot distinguish locked-in gains from paper gains
- **Fix Suggested**: Add `realized_pnl` column to portfolio_snapshots

### 2.3 What's Working Correctly

- ✅ Bet execution calculations (shares, cost, cash deduction)
- ✅ Sell execution calculations (proceeds, realized P/L)
- ✅ Settlement calculations (YES wins = shares, NO wins = 0)
- ✅ Position value updates (MTM correctly calculated)
- ✅ Transaction atomicity for all financial operations

---

## Part 3: Brier Score Calculations

### 3.1 MAJOR Issue

**Multi-Outcome Markets Not Properly Scored**
- **Location**: `/opt/forecasterarena/lib/scoring/brier.ts:69-71`
- **Problem**: Comment says "treat as binary for now" - multi-outcome Brier formula not implemented
- **Impact**: Any multi-outcome market positions will have incorrect Brier scores
- **Fix Required**: Implement `Σ(f_i - o_i)²` formula for multi-outcome markets

### 3.2 What's Working Correctly

- ✅ Binary YES/NO Brier score: `(forecast - outcome)²`
- ✅ Confidence extraction from bet sizing (implied confidence)
- ✅ Outcome recording (1 for win, 0 for loss)
- ✅ Aggregation logic (simple average - mathematically correct)
- ✅ Multi-cohort aggregation (pools all predictions, then averages)

---

## Part 4: Multi-Cohort Aggregation

### 4.1 HIGH Priority Issue

**Performance Chart Averaging Bug**
- **Location**: `/opt/forecasterarena/app/api/performance-data/route.ts:76-82`
- **Problem**: Averages portfolio values across cohorts instead of summing P/L
- **Impact**: Charts show misleading values (average of $15k and $8k = $11.5k, which no agent actually has)
- **Fix Required**: Sum P/L values or show separate lines per agent

### 4.2 MEDIUM Priority Issues

**Brier Score Not Weighted**
- Brier scores averaged without weighting by prediction count or position size
- Impact: Low - statistically impure but acceptable for benchmarking

**Missing Cohort-Level P/L Weighting**
- Return % calculated as average across cohorts assuming equal capital
- Impact: Low for now (2 cohorts), more relevant with many cohorts

### 4.3 What's Working Correctly

- ✅ Model vs Agent distinction properly maintained
- ✅ Per-cohort views correctly isolated (no data leakage)
- ✅ Aggregate P/L correctly sums across cohorts
- ✅ No double-counting detected
- ✅ Foreign key relationships correct

---

## Part 5: Transaction Safety

### 5.1 CRITICAL Issue

**Cohort Creation Race Condition**
- **Location**: `/opt/forecasterarena/lib/engine/cohort.ts:196-217`
- **Problem**: Idempotency check (`getCohortForCurrentWeek()`) is OUTSIDE the transaction
- **Scenario**: Two concurrent `/api/cron/start-cohort` calls could both see no existing cohort and create duplicates
- **Impact**: Two cohorts active simultaneously = data corruption
- **Fix Required**: Either:
  1. Add UNIQUE constraint on week
  2. Move idempotency check inside transaction
  3. Ensure cron scheduler prevents concurrent execution

### 5.2 MAJOR Issue

**Market Sync Race Condition**
- **Location**: `/opt/forecasterarena/lib/engine/market.ts:44-61`
- **Problem**: Check-then-insert pattern without transaction
- **Impact**: Duplicate market inserts could fail with UNIQUE constraint violation
- **Mitigation**: Error is caught and logged (non-fatal)

### 5.3 What's Working Correctly

- ✅ Bet execution wrapped in transaction (3 steps atomic)
- ✅ Sell execution wrapped in transaction (3 steps atomic)
- ✅ Position settlement wrapped in transaction
- ✅ Cancelled market refunds wrapped in transaction
- ✅ Cohort creation wrapped in transaction
- ✅ SQLite WAL mode enabled
- ✅ Foreign keys enforced (`PRAGMA foreign_keys = ON`)

---

## Part 6: Cron Job Reliability

### 6.1 CRITICAL Issues

**Issue #1: run-decisions Timeout Insufficient**
- **Location**: `/opt/forecasterarena/app/api/cron/run-decisions/route.ts:17`
- **Problem**: `maxDuration = 300` (5 min), but LLM calls can take 10 min each × 7 models = 70 min
- **Impact**: Cron will timeout before completing all model decisions
- **Fix Required**: Increase to at least 1800 seconds (30 min)

**Issue #2: No Previous Cohort Completion Check**
- **Location**: `/opt/forecasterarena/lib/engine/cohort.ts:58-97`
- **Problem**: `startNewCohort()` doesn't verify previous cohort is complete
- **Impact**: Multiple active cohorts possible
- **Fix Required**: Check `status = 'completed'` before starting new cohort

**Issue #3: Polymarket API No Timeout**
- **Location**: `/opt/forecasterarena/lib/polymarket/client.ts`
- **Problem**: No per-request timeout on Polymarket API calls
- **Impact**: Entire cron can hang indefinitely if Polymarket API hangs
- **Fix Required**: Add 15-second timeout per request

### 6.2 HIGH Priority Issues

**No Cron Idempotency Protection**
- If crons run twice, trades could be executed twice
- Risk: Agent could exceed balance

**OpenRouter Failure Cascades**
- No fallback if OpenRouter is down
- All 7 models fail immediately

### 6.3 Schedule Verification

| Cron | Schedule | Comment Says | Status |
|------|----------|--------------|--------|
| sync-markets | */5 * * * * | Every 5 min | ✅ Match |
| take-snapshots | */10 * * * * | "Daily 00:00 UTC" | ⚠️ MISMATCH |
| run-decisions | 0 0 * * 0 | Sunday 00:00 | ✅ Match |
| start-cohort | 5 0 * * 0 | "Sunday 00:00 (before decisions)" | ⚠️ MISMATCH - runs AFTER |
| check-resolutions | 0 * * * * | Every hour | ✅ Match |
| backup | 0 2 * * * | "Saturday 23:00 UTC" | ⚠️ MISMATCH - daily 02:00 |

---

## Part 7: Immediate Action Items

### MUST FIX Before Sunday (Critical)

1. **Increase run-decisions timeout**
   ```typescript
   // /app/api/cron/run-decisions/route.ts
   export const maxDuration = 1800; // 30 minutes, not 300
   ```

2. **Add previous cohort check in start-cohort**
   ```typescript
   // Check no active cohorts exist before starting new one
   const activeCohorts = getActiveCohorts();
   if (activeCohorts.length > 0) {
     return { success: false, error: 'Active cohort exists' };
   }
   ```

3. **Fix portfolio value fallback**
   - Replace `cash + total_invested` with actual position value calculation
   - 4 files affected (see Part 2)

4. **Verify cron scheduler prevents duplicates**
   - Confirm only ONE instance of start-cohort can run
   - If using external scheduler, ensure deduplication

### SHOULD FIX This Week (High)

5. Add per-request timeouts to Polymarket client (15 seconds)
6. Fix schedule documentation mismatches
7. Implement multi-outcome Brier score formula
8. Fix performance chart averaging bug

### CAN DEFER (Medium/Low)

9. Add realized P/L tracking in snapshots
10. Implement circuit breaker for external APIs
11. Add Brier score weighting by position size
12. Add cron health dashboard/alerting

---

## Part 8: Backup Verification

### Current Backups

| Filename | Date | Size |
|----------|------|------|
| forecaster-2025-12-08T02-00-02-004Z.db | Dec 8 | 1.8 MB |
| forecaster-2025-12-11T02-00-01-461Z.db | Dec 11 | 6.3 MB |
| forecaster-2025-12-12T02-00-02-112Z.db | Dec 12 | 6.8 MB |
| forecaster-2025-12-13T02-00-01-744Z.db | Dec 13 | 7.4 MB |

### Backup System Status

- ✅ Daily backups running at 02:00 UTC
- ✅ Uses SQLite native backup API (atomic)
- ✅ Keeps last 30 days
- ⚠️ No backup verification (checksum)
- ⚠️ No disk space monitoring

---

## Part 9: Decision Week Clarification

**Observation**: All decisions for Cohort 1 show `decision_week = 1`

**Explanation**: This is CORRECT behavior. The week number is calculated as:
```
week = floor(days_since_cohort_start / 7) + 1
```

Cohort 1 started at **23:30 UTC on Dec 7**. Decisions on Dec 14 at 00:02 are only ~6 days later, so still week 1. Week 2 begins at 23:30 on Dec 14.

**Design Note**: Consider using "Sunday count" instead of "7-day periods" for clearer week numbering.

---

## Part 10: Risk Assessment for Sunday

### If No Fixes Applied

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| run-decisions timeout | HIGH | All decisions lost | Manual re-run |
| Duplicate cohort | MEDIUM | Data corruption | Manual cleanup |
| Portfolio values wrong | HIGH | Misleading UI | Cosmetic only |
| Polymarket hang | LOW | Sync fails | Retry next cycle |

### If Critical Fixes Applied

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| LLM API down | LOW | Decisions fail | Default to HOLD |
| Market resolution delay | LOW | Positions stuck | Wait for resolution |
| Database growth | LOW | Slow queries | Scheduled optimization |

---

## Conclusion

The Forecaster Arena system is **fundamentally sound** with proper transaction handling for critical operations. However, there are **4 critical issues** that should be addressed before the next cohort:

1. ⚠️ run-decisions timeout too short
2. ⚠️ No previous cohort completion check
3. ⚠️ Cohort creation race condition
4. ⚠️ Portfolio value fallback bug

**Recommendation**: Fix items 1-4 before Sunday. The system can operate with the other issues, but they should be addressed in the coming week.

---

## Appendix: Files Audited

- `/opt/forecasterarena/lib/db/` - Database layer
- `/opt/forecasterarena/lib/engine/` - Core business logic
- `/opt/forecasterarena/lib/scoring/` - Brier score calculations
- `/opt/forecasterarena/lib/openrouter/` - LLM API client
- `/opt/forecasterarena/lib/polymarket/` - Market data client
- `/opt/forecasterarena/app/api/cron/` - All cron endpoints
- `/opt/forecasterarena/app/api/` - API routes
- `/etc/cron.d/forecasterarena` - Cron configuration

---

**Report Generated**: December 14, 2025
**Database Integrity Check**: PASSED (after index rebuild)
**Pre-Cohort Status**: CONDITIONAL GO
