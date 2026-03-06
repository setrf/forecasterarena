# Forecaster Arena Methodology v1

- Version: `v1`
- Effective from: Cohort 1
- Document status: Current implementation-aligned reference
- Last updated: March 6, 2026

This document specifies the benchmark methodology implemented by Forecaster
Arena today. It focuses on the measurement protocol rather than deployment or
operational details, but where implementation constraints materially affect the
benchmark, they are described explicitly.

---

## 1. Benchmark Objective

Forecaster Arena evaluates whether frontier LLMs can make useful, calibrated
forecasts about real future events by participating in paper-traded prediction
markets.

The benchmark is designed to measure:

- probabilistic reasoning under uncertainty
- confidence calibration
- portfolio construction and risk management
- consistency under identical decision conditions

The benchmark is explicitly not trying to measure:

- tool-augmented web research ability during a decision run
- conversational helpfulness
- coding performance
- user preference alignment

---

## 2. Why Prediction Markets

Prediction markets are used because they provide:

- future-facing questions that cannot exist in pretraining corpora as answered facts
- externally resolved outcomes
- continuously refreshed evaluation items
- market prices that can serve as a practical confidence baseline

This does not make the benchmark perfect. Prediction markets still contain
noise, liquidity issues, and crowd biases. But they are far more resistant to
benchmark contamination than static Q&A sets.

---

## 3. Unit of Competition: Cohorts

### 3.1 Definition

A cohort is an independent weekly competition instance containing one agent for
each active model.

### 3.2 Schedule

- A new cohort starts on Sunday at `00:00 UTC`
- The weekly decision run is scheduled for Sunday at `00:05 UTC`
- Cohorts remain active until all open positions resolve or are otherwise
  settled

### 3.3 Why weekly cohorts

Weekly cohorts were chosen because they:

- provide repeated samples for comparing models across time
- avoid the interpretability problems of one endless rolling contest
- are frequent enough to collect data, but not so frequent that every minor
  price move becomes a decision event

### 3.4 Cohort uniqueness

The system enforces one cohort per normalized UTC week start. This is not only
an operational convenience; it is part of benchmark integrity. Duplicate weekly
cohorts would distort aggregate results and break fair comparability.

---

## 4. Competing Models

The current active model roster is:

| Internal ID | Display Name | Provider | OpenRouter ID |
|-------------|--------------|----------|---------------|
| `gpt-5.1` | GPT-5.2 | OpenAI | `openai/gpt-5.2` |
| `gemini-2.5-flash` | Gemini 3 Pro | Google | `google/gemini-3-pro-preview` |
| `grok-4` | Grok 4.1 | xAI | `x-ai/grok-4.1-fast` |
| `claude-opus-4.5` | Claude Opus 4.5 | Anthropic | `anthropic/claude-opus-4.5` |
| `deepseek-v3.1` | DeepSeek V3.2 | DeepSeek | `deepseek/deepseek-v3.2` |
| `kimi-k2` | Kimi K2 | Moonshot AI | `moonshotai/kimi-k2-thinking` |
| `qwen-3-next` | Qwen 3 | Alibaba | `qwen/qwen3-235b-a22b-2507` |

Important note:

- Historical internal IDs are intentionally stable and may lag display-name
  updates. For example, `gpt-5.1` currently maps to display name `GPT-5.2`.
- Benchmark analysis should use stable IDs for joins and display names for
  presentation.

### 4.1 Fairness conditions

All agents receive:

- the same decision cadence
- the same market universe for a given run
- the same starting balance
- the same bet constraints
- the same system-prompt structure
- deterministic temperature (`0`)

The benchmark does not attempt to normalize provider-native context windows,
hidden reasoning behavior, or proprietary inference stacks beyond what
OpenRouter exposes.

---

## 5. Starting Capital and Constraints

Each agent begins each cohort with `$10,000` in virtual cash.

Constraints:

| Rule | Value |
|------|-------|
| Starting balance | `$10,000` |
| Minimum bet | `$50` |
| Maximum single bet | `25%` of current cash balance |
| Position model | one open position per market per side |
| Recapitalization | none |

Why these constraints exist:

- The minimum bet avoids token “dust” positions.
- The max bet forces portfolio construction rather than all-in gambling.
- One position per market/side keeps accounting and attribution auditable.
- No recapitalization makes bankruptcy and cash management meaningful.

---

## 6. Market Universe

### 6.1 Source

Markets are sourced from the Polymarket Gamma API.

### 6.2 Selection rule

The benchmark decision engine pulls the top `500` markets by volume for the
decision prompt context.

### 6.3 Market types

The system supports:

- binary markets (`YES` / `NO`)
- multi-outcome markets (named outcomes with per-outcome prices)

### 6.4 Why not all markets

Showing all markets would:

- exceed practical prompt budgets
- include illiquid noise
- make decision context uneven in quality

The top-volume filter is therefore part of the benchmark design, not just a UI
optimization.

---

## 7. Information Provided to Models

During a weekly decision run, each agent receives:

### 7.1 Portfolio state

- current cash balance
- open positions
- average entry price
- side-correct current price
- current marked value
- unrealized P/L

For binary markets, the stored market price is the `YES` price. When a model
holds a `NO` position, the prompt converts that to the side-correct price so
the model sees the relevant value for its existing exposure.

### 7.2 Market list

For each selected market, the prompt includes fields such as:

- market ID
- question
- category
- current price or outcome prices
- volume
- close date

### 7.3 Information intentionally omitted

The weekly prompt does not directly provide:

- real-time news browsing
- other models’ positions or decisions
- explicit historical price series
- human-authored external commentary

This keeps the benchmark focused on model reasoning over a shared static
snapshot.

---

## 8. Decision Protocol

### 8.1 Allowed actions

Each model must output one of:

- `BET`
- `SELL`
- `HOLD`

### 8.2 BET format

```json
{
  "action": "BET",
  "bets": [
    { "market_id": "uuid", "side": "YES", "amount": 500.0 }
  ],
  "reasoning": "Why this trade should be made."
}
```

### 8.3 SELL format

```json
{
  "action": "SELL",
  "sells": [
    { "position_id": "uuid", "percentage": 100 }
  ],
  "reasoning": "Why this position should be reduced or exited."
}
```

### 8.4 HOLD format

```json
{
  "action": "HOLD",
  "reasoning": "Why the current portfolio should remain unchanged."
}
```

### 8.5 Response validation

The engine:

- parses the response
- validates structure and value ranges
- retries malformed outputs up to the configured malformed-response retry limit
- defaults to `HOLD` if the output still cannot be made valid

This fallback is part of benchmark execution because a benchmark run must
complete even when a model’s output format fails.

---

## 9. Decision Execution Semantics

### 9.1 Sequential processing

Within a cohort, agents are processed sequentially.

This means:

- all models still see the same market universe
- but each model is called one after another, not concurrently

The design is intended to reduce provider contention and keep operations
predictable.

### 9.2 Idempotency and claim-before-call

The engine now claims a unique decision row for
`(agent_id, cohort_id, decision_week)` before making the network call.

Why this matters:

- overlapping cron executions must not generate duplicate decisions
- duplicate trades would invalidate the fairness of the benchmark
- retryable failures should update the same decision row, not create a new one

This is an implementation safeguard that directly supports benchmark integrity.

### 9.3 Retryable zero-trade results

If a model emits `BET` or `SELL` but all executions fail, the result is stored as
a retryable failure rather than as a final successful decision.

That allows the system to distinguish:

- valid “no action” outcomes, from
- apparent trading decisions that produced zero state change

---

## 10. Trade Accounting

### 10.1 BET execution

For a buy:

- cash balance decreases by `total_amount`
- open position cost basis increases
- shares are computed from `amount / executable_price`

### 10.2 SELL execution

For a sell:

- a fraction of the position is reduced or closed
- realized proceeds are returned to cash
- cost basis is reduced proportionally

### 10.3 Binary price handling

For binary markets:

- `YES` trades use the stored `current_price`
- `NO` trades use `1 - current_price`

### 10.4 Multi-outcome handling

For multi-outcome markets:

- the engine reads the named outcome price from `current_prices`
- invalid or missing outcome prices cause execution failure

---

## 11. Scoring

Forecaster Arena uses two primary evaluation axes:

1. calibration quality
2. portfolio value generation

### 11.1 Brier score

For a resolved trade:

```text
Brier = (forecast_probability - actual_outcome)^2
```

Where:

- `forecast_probability` is derived from bet size
- `actual_outcome` is `1` if the traded side won, otherwise `0`

Interpretation:

- lower is better
- `0` is perfect
- `0.25` corresponds to an uninformative 50/50 forecast on binary outcomes

### 11.2 Implied confidence from position sizing

The system derives confidence from bet size:

```text
max_possible_bet = cash_balance * 0.25
implied_confidence = bet_amount / max_possible_bet
```

This intentionally couples stated conviction to actual capital allocation.

### 11.3 Portfolio returns

Portfolio return is measured from the `$10,000` cohort baseline:

```text
Return % = (total_value - 10000) / 10000 * 100
```

### 11.4 Why both metrics are required

Portfolio return alone can reward luck or over-concentration.
Brier score alone can ignore practical value generation.

Using both means the benchmark values:

- being right
- knowing how confident to be
- and sizing positions coherently

---

## 12. Snapshot Methodology

### 12.1 Cadence

Portfolio snapshots are taken on a 10-minute schedule.

### 12.2 Stored values

Each snapshot records:

- cash balance
- positions value
- total value
- total P/L
- total P/L percent
- cumulative Brier score
- number of resolved bets

### 12.3 Timestamp semantics

Snapshots use `snapshot_timestamp`, not a daily bucket.

This supports:

- intraday chart ranges such as `10M` and `1H`
- detailed debugging of position valuation
- cohort-level and aggregate model curves

### 12.4 Closed-but-unresolved handling

When a market is closed but unresolved and fresh pricing is unusable, the system
can fall back to prior valuation behavior rather than collapsing the position to
zero. This preserves more stable mark-to-market curves during settlement gaps.

---

## 13. Resolution Methodology

### 13.1 Source of truth

Resolution status is checked against Polymarket.

### 13.2 Local resolution ordering

The local system only marks a market `resolved` after settlement succeeds.

This is important because marking a market resolved too early can strand open
positions that would no longer be revisited by later resolution jobs.

### 13.3 Unknown or indeterminate winners

If upstream data says a market is resolved but the winning outcome cannot be
reliably determined, the system refunds positions as `CANCELLED`.

This is a conservative operational choice intended to protect benchmark
accounting from ambiguous resolution data.

---

## 14. Reproducibility and Auditability

The benchmark stores:

- full prompts
- raw model responses
- parsed decision payloads
- trade records
- portfolio snapshots
- Brier scores
- system logs

This supports:

- replay and inspection
- external research review
- debugging of model and execution failures
- export of bounded data slices for analysis

---

## 15. What This Benchmark Still Does Not Solve

Important limitations remain:

### 15.1 Static-knowledge bias

Even though the target event is in the future, models still reason from a
frozen knowledge state rather than from live browsing during the run.

### 15.2 Market-efficiency dependency

Markets themselves may already reflect public consensus or liquidity distortions.
The benchmark therefore evaluates forecasting inside a market environment, not
in isolation from it.

### 15.3 Provider changes over time

Hosted models can change behavior between benchmark weeks even when internal IDs
stay constant.

### 15.4 Sequential execution reality

The benchmark is operationally deterministic, but not infinitely parallel.
Decision runtime and provider availability can still shape what “production
reproducibility” means in practice.

---

## 16. Methodology Boundaries

Changes that would require a methodology version bump include:

- altering scoring formulas
- changing starting balance or bet constraints
- changing market-selection rules
- adding or removing decision actions
- introducing external retrieval or tool use into the prompt protocol

Changes that can happen without a methodology bump include:

- implementation hardening for safety or idempotency
- UI improvements
- admin/export/security improvements
- model display-name refreshes when the benchmark protocol itself is unchanged
