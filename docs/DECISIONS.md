# Design Decisions Log

This document records all significant design decisions made for Forecaster Arena, including the rationale and alternatives considered.

---

## Decision Log

### D001: Cohort System Design

**Date**: 2024  
**Status**: Approved

**Decision**: Implement a weekly cohort system where each cohort runs independently until all bets resolve.

**Rationale**:
- Multiple cohorts provide statistical power for comparing model performance
- Independent cohorts allow analysis across different market conditions
- No artificial time limit ensures accurate final scoring
- Weekly cadence balances data collection with meaningful market movements

**Alternatives Considered**:
1. Single continuous competition - Rejected: harder to analyze statistically
2. Fixed 90-day cohorts - Rejected: would require mark-to-market estimation for unresolved bets
3. Monthly cohorts - Rejected: too infrequent for timely data collection

---

### D002: Starting Balance

**Date**: 2024  
**Status**: Approved

**Decision**: Each LLM starts with $10,000 virtual dollars per cohort.

**Rationale**:
- Round number for easy percentage calculations
- Large enough to allow multiple meaningful bets
- Small enough that bet sizing decisions matter

**Alternatives Considered**:
1. $1,000 - Rejected: too constraining with $50 minimum bet
2. $100,000 - Rejected: makes individual bet outcomes less meaningful

---

### D003: Market Selection (Top 100 by Volume)

**Date**: 2024  
**Status**: Approved

**Decision**: Show LLMs only the top 100 markets by trading volume.

**Rationale**:
- Higher volume markets have more reliable prices
- Limits context window usage
- Focuses on most liquid/active markets

**Alternatives Considered**:
1. All markets - Rejected: too many for context window, includes illiquid markets
2. Curated categories - Rejected: introduces selection bias
3. Top 50 - Rejected: may miss good opportunities

---

### D004: Betting Constraints

**Date**: 2024  
**Status**: Approved

**Decision**: 
- Minimum bet: $50
- Maximum bet: 25% of cash balance
- One position per market per side

**Rationale**:
- Minimum prevents noise from trivial bets
- Maximum prevents all-in strategies, encourages portfolio thinking
- One position simplifies tracking and prevents position manipulation

---

### D005: Temperature 0

**Date**: 2024  
**Status**: Approved

**Decision**: Use temperature 0 for all LLM API calls.

**Rationale**:
- Ensures reproducibility
- Same input should produce same output
- Reduces noise in performance measurement
- Allows verification of results

**Alternatives Considered**:
1. Temperature 0.7 - Rejected: introduces randomness, harder to reproduce
2. Per-model optimal temperature - Rejected: unfair comparison

---

### D006: Brier Score from Bet Size

**Date**: 2024  
**Status**: Approved

**Decision**: Derive implied probability from bet size using linear formula: confidence = bet_amount / max_possible_bet

**Rationale**:
- Bet size is a natural expression of confidence
- Linear relationship is simple and interpretable
- Maximum bet = 100% confidence makes intuitive sense

**Formula**:
```
max_bet = cash_balance * 0.25
implied_confidence = min(bet_amount / max_bet, 1.0)
```

**Alternatives Considered**:
1. Ask LLM for explicit probability - Rejected: adds complexity, may not correlate with bet size
2. Kelly criterion-based - Rejected: requires assumptions about edge
3. Non-linear mapping - Rejected: harder to interpret

---

### D007: Weekly Decision Frequency

**Date**: 2024  
**Status**: Approved

**Decision**: LLMs make decisions once per week (Sunday 00:00 UTC).

**Rationale**:
- Balances API costs with data collection
- Allows meaningful market movements between decisions
- Sunday midnight provides consistent global timing

**Alternatives Considered**:
1. Daily - Rejected: expensive, markets don't move that fast
2. Every 3 minutes (like previous version) - Rejected: too frequent, expensive
3. Monthly - Rejected: too infrequent, misses opportunities

---

### D008: No Refills Policy

**Date**: 2024  
**Status**: Approved

**Decision**: If an LLM reaches $0, they remain bankrupt for that cohort.

**Rationale**:
- Creates meaningful consequences for bad decisions
- Tests risk management ability
- Prevents gaming through intentional bankruptcy and restart

---

### D009: SQLite Database

**Date**: 2024  
**Status**: Approved

**Decision**: Use SQLite with better-sqlite3 for data storage.

**Rationale**:
- Self-contained, no external dependencies
- Excellent performance for read-heavy workloads
- Easy backup (single file copy)
- Suitable for single-server deployment

**Alternatives Considered**:
1. PostgreSQL - Rejected: overkill for single-server, requires separate process
2. MongoDB - Rejected: schema-less not ideal for structured data
3. In-memory only - Rejected: need persistence

---

### D010: OpenRouter for LLM Access

**Date**: 2024  
**Status**: Approved

**Decision**: Use OpenRouter API for unified access to all LLM models.

**Rationale**:
- Single API for all models
- Consistent request/response format
- Automatic fallbacks and rate limiting
- Simplifies billing and monitoring

---

### D011: Full Prompt Storage

**Date**: 2024  
**Status**: Approved

**Decision**: Store complete system and user prompts for every decision.

**Rationale**:
- Critical for reproducibility
- Enables analysis of prompt effectiveness
- Allows verification of fair treatment
- Supports academic publication

**Trade-off**: Increased storage requirements (acceptable)

---

### D012: Public Methodology Documentation

**Date**: 2024  
**Status**: Approved

**Decision**: Make complete prompts and methodology publicly available.

**Rationale**:
- Transparency enables academic scrutiny
- Allows others to reproduce results
- Builds trust in the benchmark
- Aligns with open science principles

**Trade-off**: LLMs could potentially be trained on the prompts (accepted as inevitable)

---

### D013: View-Only Data Access

**Date**: 2024  
**Status**: Approved

**Decision**: Data is viewable on website but not bulk-downloadable.

**Rationale**:
- Protects against data scraping
- Maintains control over data usage
- Still allows visual inspection
- Bulk access available on request for researchers

---

### D014: Versioned Methodology

**Date**: 2024  
**Status**: Approved

**Decision**: Methodology is versioned (v1, v2, etc.) with each cohort tied to a specific version.

**Rationale**:
- Enables methodology evolution without invalidating historical data
- Clear changelog of what changed
- Standard practice in academic benchmarks

---

### D015: 7 Initial Models

**Date**: 2024  
**Status**: Approved

**Decision**: Start with 7 models: GPT-5.1, Gemini 3 Pro, Grok 4, Claude Opus 4.5, DeepSeek V3, Kimi K2, Qwen 3.

**Rationale**:
- Covers major LLM providers
- Mix of commercial and open-weight models
- Manageable number for visualization
- New models can be added to future cohorts

---

### D016: Retry Once on Malformed Response

**Date**: 2024  
**Status**: Approved

**Decision**: If LLM returns unparseable response, retry once with clarifying prompt. If still fails, treat as HOLD.

**Rationale**:
- Single retry handles transient issues
- Doesn't penalize models too heavily for occasional parsing errors
- HOLD is safe default that doesn't harm the model

---

### D017: Multi-Outcome Market Support

**Date**: 2024  
**Status**: Approved

**Decision**: Support both binary (YES/NO) and multi-outcome markets.

**Rationale**:
- Opens up more betting opportunities
- Tests more complex forecasting ability
- Brier score formula works for multi-outcome

---

### D018: Daily Portfolio Snapshots

**Date**: 2024  
**Status**: Approved

**Decision**: Take portfolio snapshots daily for all agents.

**Rationale**:
- Enables detailed performance charts
- Allows analysis of performance over time
- Captures mark-to-market values between decisions



