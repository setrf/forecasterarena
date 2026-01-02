# Forecaster Arena Methodology v1

**Version**: 1.0  
**Effective From**: Cohort 1  
**Last Updated**: 2024

---

## Abstract

Forecaster Arena is a benchmark for evaluating Large Language Model (LLM) forecasting capabilities using real prediction markets. Unlike traditional benchmarks that may be contaminated by training data, this system tests genuine predictive reasoning by requiring models to forecast real-world outcomes that have not yet occurred.

This document specifies the complete methodology for v1 of the benchmark, including the cohort system, decision protocol, scoring methodology, and statistical considerations.

---

## 1. Introduction

### 1.1 Motivation

Traditional LLM benchmarks face a fundamental challenge: models may have been trained on the very data used for evaluation. This leads to benchmark saturation and inflated performance metrics that do not reflect genuine reasoning capabilities.

Prediction markets offer a unique solution. They present questions about future events, outcomes that cannot exist in any training data because they have not happened yet. By having LLMs make forecasts on these markets, we can evaluate their ability to:

1. Reason about uncertainty
2. Synthesize information from their knowledge base
3. Make calibrated probability estimates
4. Manage risk across a portfolio

### 1.2 The Problem with Traditional Benchmarks

- **Data contamination**: Training data may contain benchmark answers
- **Memorization vs. reasoning**: High scores may reflect memorization, not understanding
- **Static nature**: Benchmarks become stale as models improve
- **Lack of real-world grounding**: Abstract tasks may not reflect practical capabilities

### 1.3 Reality as Benchmark

Prediction markets provide:

- **Novel questions**: Markets are created for future events
- **Objective resolution**: Outcomes are determined by reality, not human judgment
- **Continuous renewal**: New markets are created constantly
- **Calibration testing**: Market prices provide probability baselines

---

## 2. System Design

### 2.1 Cohort System

**Design Rationale**: Running multiple independent cohorts provides statistical power and allows comparison across different market conditions.

**Specification**:
- A new cohort starts automatically every Sunday at 00:00 UTC
- Each cohort includes all 7 LLM models
- Each model starts with $10,000 virtual currency
- Cohorts run until ALL bets resolve (no artificial time limit)
- No refills: if a model reaches $0, it remains bankrupt for that cohort

**Why This Design**:
- Weekly cadence balances data collection speed with meaningful market movements
- No time limit ensures accurate final scoring (no mark-to-market estimation)
- Multiple cohorts enable statistical analysis across different market regimes

### 2.2 Market Selection

**Source**: Polymarket Gamma API (public, no authentication required)

**Selection Criteria**:
- Top 500 markets by trading volume
- Active status (not closed or resolved)
- Both binary (YES/NO) and multi-outcome markets supported

**Why Top 500 by Volume**:
- Higher volume indicates more liquid markets with reliable prices
- Reduces noise from illiquid markets with unreliable price signals
- Keeps prompt size manageable for LLM context windows

### 2.3 LLM Configuration

**Models** (v1):
1. GPT-5.1 (OpenAI)
2. Gemini 2.5 Flash (Google)
3. Grok 4 (xAI)
4. Claude Opus 4.5 (Anthropic)
5. DeepSeek V3.1 (DeepSeek)
6. Kimi K2 (Moonshot AI)
7. Qwen 3 Next (Alibaba)

**API Configuration**:
- Temperature: 0 (deterministic for reproducibility)
- All models accessed via OpenRouter unified API
- Identical prompts for all models (fairness)

**Why Temperature 0**:
- Reproducibility: Same inputs should yield same outputs
- Reduces noise in performance measurement
- Allows verification of results

---

## 3. Decision Protocol

### 3.1 Information Provided

Each week, LLMs receive:

1. **Portfolio State**:
   - Current cash balance
   - Open positions with mark-to-market values
   - Total portfolio value and P/L

2. **Market Information** (Top 500 by volume):
   - Market ID
   - Question text
   - Category
   - Current price (YES probability for binary markets)
   - Trading volume
   - Close date

**What Is NOT Provided**:
- Price history (only current price)
- News or external context
- Other models' decisions

### 3.2 Action Space

LLMs can take three types of actions:

1. **BET**: Place a new bet on a market
   - Specify: market_id, side (YES/NO), amount
   - Can place multiple bets in one decision

2. **SELL**: Close or reduce an existing position
   - Specify: position_id, percentage (1-100%)
   - Can sell multiple positions in one decision

3. **HOLD**: Take no action this week

### 3.3 Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Minimum bet | $50 | Prevents noise from trivial bets |
| Maximum bet | 25% of cash balance | Risk management, prevents all-in strategies |
| Positions per market | 1 per side | Simplifies portfolio tracking |
| Partial sells | Allowed | Enables nuanced position management |

---

## 4. Scoring Methodology

### 4.1 Brier Score

The Brier Score measures forecast accuracy. Lower is better (0 = perfect, 1 = worst).

**Formula**:
$$\text{Brier} = (f - o)^2$$

Where:
- $f$ = forecast probability (0 to 1)
- $o$ = actual outcome (1 if correct, 0 if incorrect)

**Deriving Forecast Probability from Bet Size**:

Since LLMs express confidence through bet sizing:

$$\text{confidence} = \frac{\text{bet\_amount}}{\text{max\_possible\_bet}}$$

Where max_possible_bet = 25% of cash balance at time of bet.

**Examples**:
- Bet $2,500 with $10,000 balance -> confidence = 100%
- Bet $1,250 with $10,000 balance -> confidence = 50%
- Bet $50 with $10,000 balance -> confidence = 2%

**For NO Bets**:
- A NO bet with confidence X is equivalent to a YES bet with confidence (1-X)

### 4.2 Portfolio Returns

Simple percentage return from initial balance:

$$\text{Return} = \frac{\text{final\_value} - 10000}{10000} \times 100\%$$

### 4.3 Aggregate Metrics

**Per Model (across all cohorts)**:
- Average Brier Score
- Average Return
- Win Rate (% of bets that were correct)
- Number of resolved bets

**Statistical Significance**:
- Multiple cohorts provide independent samples
- Confidence intervals can be computed for rankings

---

## 5. Statistical Considerations

### 5.1 Multiple Cohorts

Running multiple cohorts enables:
- Estimation of performance variance
- Detection of regime-dependent performance
- Statistical testing of model differences

### 5.2 Confidence Intervals

With $n$ cohorts, we can estimate:
- Mean performance: $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$
- Standard error: $SE = \frac{s}{\sqrt{n}}$
- 95% CI: $\bar{x} \pm 1.96 \times SE$

### 5.3 Limitations

1. **Market efficiency**: Prediction markets may already incorporate available information
2. **Model updates**: LLM versions may change during the benchmark period
3. **Market availability**: Not all topics have active prediction markets
4. **Single decision per week**: May miss optimal timing

---

## 6. Reproducibility

### 6.1 Data Availability

All data is stored and can be inspected:
- Full prompts sent to each LLM
- Complete responses received
- All trades executed
- Market prices at decision time

### 6.2 Code Availability

The complete system is open source:
- Repository: [GitHub URL]
- License: MIT

### 6.3 Prompt Transparency

Full prompts are documented in [PROMPT_DESIGN.md](./PROMPT_DESIGN.md).

---

## Appendix A: Full Prompt Templates

See [PROMPT_DESIGN.md](./PROMPT_DESIGN.md) for complete prompt specifications.

## Appendix B: Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

## Appendix C: Mathematical Formulas

### Brier Score (Binary Markets)
$$BS = (f - o)^2$$

### Brier Score (Multi-Outcome Markets)
$$BS = \sum_{i=1}^{R} (f_i - o_i)^2$$

Where R is the number of outcomes.

### Implied Confidence from Bet Size
$$c = \min\left(\frac{a}{b \times 0.25}, 1.0\right)$$

Where:
- $c$ = implied confidence
- $a$ = bet amount
- $b$ = cash balance at time of bet

### Position Value (Mark-to-Market)
For YES positions: $V = \text{shares} \times \text{current\_price}$
For NO positions: $V = \text{shares} \times (1 - \text{current\_price})$

### Settlement Value
$$V = \begin{cases} \text{shares} \times 1.0 & \text{if side matches outcome} \\ 0 & \text{otherwise} \end{cases}$$

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2024 | Initial methodology |
