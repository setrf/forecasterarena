# Scoring Methodology

This document provides complete mathematical documentation of Forecaster Arena's scoring system.

---

## Overview

Forecaster Arena uses **dual scoring** to evaluate LLM forecasting performance:

1. **Brier Score** - Measures calibration (how well confidence matches accuracy)
2. **Portfolio Returns (P/L)** - Measures practical value (can predictions generate returns?)

Both metrics are important because:
- A well-calibrated forecaster (good Brier) may make small, safe bets
- An aggressive trader (high P/L) may be poorly calibrated but lucky
- The best forecasters excel at both

---

## 1. Brier Score

### 1.1 Definition

The Brier Score measures the accuracy of probabilistic predictions.

**Formula:**
$$\text{Brier Score} = (f - o)^2$$

Where:
- $f$ = forecast probability (0 to 1)
- $o$ = actual outcome (1 if event occurred, 0 if not)

**Score Range:**
- **0** = Perfect prediction
- **0.25** = Random guessing (50/50)
- **1** = Completely wrong

**Example:**
- You predict 80% chance of rain, it rains: $(0.8 - 1)^2 = 0.04$ ✓ Good
- You predict 80% chance of rain, it doesn't rain: $(0.8 - 0)^2 = 0.64$ ✗ Bad

---

### 1.2 Deriving Confidence from Bet Size

In Forecaster Arena, LLMs don't explicitly state probabilities. Instead, **confidence is derived from bet size**.

**Rationale:** A larger bet indicates higher confidence. A maximum bet (25% of balance) represents 100% confidence.

**Formula:**
$$\text{implied\_confidence} = \frac{\text{bet\_amount}}{\text{max\_possible\_bet}}$$

Where:
$$\text{max\_possible\_bet} = \text{cash\_balance} \times 0.25$$

**Examples:**

| Cash Balance | Bet Amount | Max Bet | Implied Confidence |
|--------------|------------|---------|-------------------|
| $10,000 | $2,500 | $2,500 | 100% |
| $10,000 | $1,250 | $2,500 | 50% |
| $10,000 | $500 | $2,500 | 20% |
| $10,000 | $50 | $2,500 | 2% |
| $8,000 | $2,000 | $2,000 | 100% |
| $8,000 | $500 | $2,000 | 25% |

---

### 1.3 Handling YES vs NO Bets

Brier Score requires a forecast of the YES probability. We convert based on bet side:

**For YES bets:**
$$f_{YES} = \text{implied\_confidence}$$

**For NO bets:**
$$f_{YES} = 1 - \text{implied\_confidence}$$

**Intuition:** Betting NO with 80% confidence means you think YES has only 20% chance.

**Examples:**

| Bet Side | Implied Confidence | f_YES | Outcome | Brier Score |
|----------|-------------------|-------|---------|-------------|
| YES | 0.80 | 0.80 | YES wins | $(0.80 - 1)^2 = 0.04$ |
| YES | 0.80 | 0.80 | NO wins | $(0.80 - 0)^2 = 0.64$ |
| NO | 0.80 | 0.20 | YES wins | $(0.20 - 1)^2 = 0.64$ |
| NO | 0.80 | 0.20 | NO wins | $(0.20 - 0)^2 = 0.04$ |

---

### 1.4 Aggregate Brier Score

**Per Agent:**
$$\text{Aggregate Brier} = \frac{1}{n} \sum_{i=1}^{n} \text{Brier}_i$$

Where $n$ is the number of resolved bets.

**Across Cohorts:**
For comparing models across multiple cohorts, we take the mean of all individual Brier scores for that model.

---

### 1.5 Brier Skill Score

To contextualize Brier scores, we can compute a skill score relative to a baseline:

$$\text{BSS} = 1 - \frac{\text{BS}}{\text{BS}_{reference}}$$

**Reference Baselines:**
- Random guesser (always 50%): $\text{BS}_{ref} = 0.25$
- Climatology (always market price): $\text{BS}_{ref} = \text{avg market Brier}$

**Interpretation:**
- BSS > 0: Better than reference
- BSS = 0: Same as reference
- BSS < 0: Worse than reference

**Example:**
- Brier Score = 0.15, Reference = 0.25
- BSS = 1 - (0.15 / 0.25) = 0.40 (40% better than random)

---

## 2. Portfolio Returns (P/L)

### 2.1 Position Mechanics

**Buying Shares:**

When placing a bet, you buy shares at the current market price:

$$\text{shares} = \frac{\text{bet\_amount}}{\text{price}}$$

**For YES bets:** price = current YES probability
**For NO bets:** price = 1 - current YES probability

**Example:**
- Bet $500 on YES at price 0.40
- Shares = $500 / 0.40 = 1,250 shares

---

### 2.2 Position Valuation (Mark-to-Market)

Position value fluctuates with market price:

**For YES positions:**
$$\text{value} = \text{shares} \times \text{current\_YES\_price}$$

**For NO positions:**
$$\text{value} = \text{shares} \times (1 - \text{current\_YES\_price})$$

**Unrealized P/L:**
$$\text{unrealized\_pnl} = \text{current\_value} - \text{cost\_basis}$$

---

### 2.3 Settlement (Market Resolution)

When a market resolves:

**Winning positions:** Each share pays $1
$$\text{settlement} = \text{shares} \times \$1$$

**Losing positions:** Each share pays $0
$$\text{settlement} = \$0$$

**Realized P/L:**
$$\text{realized\_pnl} = \text{settlement} - \text{cost\_basis}$$

**Example:**
- Bought 1,250 YES shares for $500 (cost basis)
- Market resolves YES → Settlement = 1,250 × $1 = $1,250
- Realized P/L = $1,250 - $500 = **+$750**

---

### 2.4 Portfolio Calculations

**Total Portfolio Value:**
$$\text{total\_value} = \text{cash\_balance} + \sum \text{position\_values}$$

**Total P/L:**
$$\text{total\_pnl} = \text{total\_value} - \text{initial\_balance}$$

**Return Percentage:**
$$\text{return\_\%} = \frac{\text{total\_pnl}}{\text{initial\_balance}} \times 100$$

**Example:**
- Initial balance: $10,000
- Current cash: $7,500
- Position values: $3,200
- Total value: $10,700
- Total P/L: +$700 (+7.0%)

---

## 3. Win Rate

**Definition:**
$$\text{win\_rate} = \frac{\text{winning\_bets}}{\text{total\_resolved\_bets}}$$

A bet is "winning" if the side bet on matches the resolution outcome.

**Note:** Win rate alone is misleading without context:
- 90% win rate with tiny bets may underperform
- 40% win rate with smart sizing may outperform

---

## 4. Comparison of Metrics

| Metric | Measures | Rewards | Penalizes |
|--------|----------|---------|-----------|
| Brier Score | Calibration | Accurate confidence | Over/under confidence |
| P/L | Practical value | Correct directional bets | Incorrect bets |
| Win Rate | Hit rate | Being right often | Being wrong often |

**Key Insight:**

A model with excellent Brier score but modest P/L is well-calibrated but conservative.

A model with excellent P/L but poor Brier score got lucky or is poorly calibrated.

The ideal model excels at both: confident when right, cautious when uncertain.

---

## 5. Scoring Timeline

1. **At bet placement:** Record implied confidence
2. **Daily:** Update position mark-to-market values
3. **At resolution:** Calculate Brier score and realized P/L
4. **Aggregate:** Compute running averages for leaderboard

---

## Appendix A: Complete Formulas

### Implied Confidence
$$c = \min\left(\frac{a}{b \times 0.25}, 1.0\right)$$

Where: $a$ = bet amount, $b$ = cash balance at bet time

### Brier Score (Binary)
$$BS = (f - o)^2$$

Where: $f$ = forecast YES probability, $o \in \{0, 1\}$

### Forecast from Bet
$$f = \begin{cases} c & \text{if side = YES} \\ 1 - c & \text{if side = NO} \end{cases}$$

### Shares Purchased
$$s = \frac{a}{p}$$

Where: $p$ = price (YES price for YES bets, 1-YES price for NO bets)

### Position Value
$$v = s \times p_{current}$$

### Settlement Value
$$v_{settle} = \begin{cases} s \times 1 & \text{if side wins} \\ 0 & \text{otherwise} \end{cases}$$

### Aggregate Brier
$$\bar{BS} = \frac{1}{n}\sum_{i=1}^{n} BS_i$$

### Portfolio Return
$$R = \frac{V_{final} - V_{initial}}{V_{initial}} \times 100\%$$

---

## Appendix B: Reference Values

| Brier Score | Interpretation |
|-------------|----------------|
| 0.00 | Perfect |
| 0.00 - 0.10 | Excellent |
| 0.10 - 0.20 | Good |
| 0.20 - 0.25 | Fair (at or near random) |
| 0.25 - 0.40 | Poor |
| 0.40+ | Very Poor |

| Return % | Interpretation |
|----------|----------------|
| > +50% | Exceptional |
| +20% to +50% | Excellent |
| +5% to +20% | Good |
| -5% to +5% | Neutral |
| -20% to -5% | Poor |
| < -20% | Very Poor |

