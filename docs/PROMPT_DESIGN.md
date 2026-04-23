# Prompt Design Documentation

This document describes the live Forecaster Arena prompts used for v2 decision
runs. The source of truth is the prompt code in:

- `lib/openrouter/prompts/systemPrompt.ts`
- `lib/openrouter/prompts/userPrompt.ts`
- `lib/openrouter/prompts/retryPrompt.ts`

---

## System Prompt

The system prompt establishes the LLM's role, valid action schema, and scoring
frame. It is identical for all models in a run.

```text
You are an AI forecaster participating in Forecaster Arena (v2), a benchmark that tests AI prediction capabilities on real-world events using Polymarket prediction markets.

YOUR OBJECTIVE:
Maximize the value of your paper portfolio by making grounded decisions about unsettled real-world events. Prediction markets provide the event questions, timestamped prices, and settlement criteria; your portfolio value is the primary score.

DECISION FORMAT:
You must respond with valid JSON in exactly one of these formats:

FOR PLACING BETS:
{
  "action": "BET",
  "bets": [
    {
      "market_id": "uuid",
      "side": "YES" or "NO" (for binary markets) OR outcome name (for multi-outcome markets),
      "amount": 500.00
    }
  ],
  "reasoning": "Your detailed reasoning"
}

MARKET TYPES:
- Binary markets: Use "YES" or "NO" as the side
- Multi-outcome markets: Use the exact outcome name as the side (e.g., "Trump", "Harris", "Other")
  Multi-outcome markets show outcomes and prices like: Outcomes: ["Trump", "Harris"] Prices: {"Trump": 0.55, "Harris": 0.45}

FOR SELLING POSITIONS:
{
  "action": "SELL",
  "sells": [
    {
      "position_id": "uuid",
      "percentage": 100
    }
  ],
  "reasoning": "Your detailed reasoning"
}

FOR HOLDING:
{
  "action": "HOLD",
  "reasoning": "Your detailed reasoning"
}

RULES:
1. Minimum bet: $50
2. Maximum bet: 25% of your current cash balance
3. One position per market per side
4. You can make multiple bets/sells in one decision
5. Bet size is a capital-allocation decision under uncertainty

SCORING:
- Primary ranking: portfolio value = cash + marked position value
- Resolved positions settle according to the real-world market outcome
- Open positions are marked to current market prices
- Realized P/L, unrealized P/L, win rate, and activity may be shown as secondary statistics

RESPOND WITH VALID JSON ONLY. No markdown, no explanation outside the JSON.
```

---

## User Prompt Template

The user prompt contains the current date, cohort week, portfolio state, current
positions, and available market information.

```text
CURRENT DATE: {YYYY-MM-DD}
DECISION WEEK: {week_number}

YOUR PORTFOLIO:
- Cash Balance: ${cash_balance}
- Maximum Bet Size: ${max_bet} (25% of cash)
- Positions Value: ${positions_value}
- Total Portfolio: ${total_value}
- P/L: ${pnl} ({signed_pnl_percent}%)

YOUR CURRENT POSITIONS:
- ID: {position_id}
  Market: "{market_question}"
  Side: {side} | Shares: {shares}
  Entry: {entry_price}% | Current: {current_price}%
  Value: ${value} | P/L: ${position_pnl}

AVAILABLE MARKETS (Top {market_count} by volume):
- ID: {market_id}
  Question: "{question}"
  Category: {category}
  Type: Binary (YES/NO)
  Prices: {yes_price}% YES / {no_price}% NO
  Volume: ${volume}
  Closes: {close_date}

- ID: {market_id}
  Question: "{question}"
  Category: {category}
  Type: Multi-outcome
  Outcomes: ["{outcome_1}", "{outcome_2}"]
  Prices: {"{outcome_1}": {price_1}, "{outcome_2}": {price_2}}
  Volume: ${volume}
  Closes: {close_date}

What is your decision? Respond with valid JSON only.
```

If there are no current positions, the positions section is:

```text
YOUR CURRENT POSITIONS: None
```

---

## Retry Prompt

If the initial response is malformed or fails validation, the system retries
once by appending the validation error and truncated previous response to the
original user prompt.

```text
---
PREVIOUS RESPONSE WAS INVALID:
Error: {error_message}

Your response: {previous_response_truncated_to_500_chars}

Please respond with VALID JSON only. No markdown code blocks, no explanation text - just the JSON object.
```

If the retry also fails, the decision defaults to `HOLD` and the failure is
logged.

---

## Design Rationale

### Why JSON Format?

1. **Structured output:** Easier to parse and validate.
2. **Unambiguous actions:** The engine can distinguish bets, sells, and holds.
3. **Reasoning capture:** Model rationale is preserved for analysis and audit.
4. **Batching:** A valid response can include multiple bets or sells.

### Why Include Reasoning?

1. **Transparency:** The benchmark can inspect why decisions were made.
2. **Analysis:** Researchers can compare reasoning quality across models.
3. **Debugging:** Systematic prompt or model failures are easier to identify.
4. **Auditability:** Decisions remain interpretable after markets resolve.

### Why Portfolio-Value Framing?

Methodology v2 ranks by paper portfolio value:

```text
portfolio_value = cash + marked_position_value
```

The prompt therefore tells models to maximize portfolio value and describes
bet size as a capital-allocation decision. It does not instruct models that bet
size is an implied confidence score, and it does not present Brier score or
calibration as the active scoring methodology.

### Why Include Market Type?

The live prompt supports both binary and multi-outcome markets:

- Binary markets use `YES` or `NO`.
- Multi-outcome markets require the exact outcome name as the side.

This keeps the response schema compact while allowing the engine to validate
market-specific side names.

### Why Limit Market Information?

1. **Context window:** The prompt must fit across all supported models.
2. **Reproducibility:** Models in a run receive the same market snapshot.
3. **Liquidity:** The market list is volume-filtered.
4. **Focus:** The prompt avoids extra commentary that could bias decisions.

### Why Temperature = 0?

1. **Reproducibility:** Same input should produce stable behavior.
2. **Determinism:** Results are easier to audit.
3. **Fair comparison:** Random sampling is not a hidden competitor variable.
4. **Scientific rigor:** Cohort comparisons are more meaningful.

---

## Information Not Provided

The prompt deliberately omits:

1. **Price history:** The live prompt provides current prices, not trends.
2. **News context:** Models must reason from their own knowledge and market data.
3. **Other models' decisions:** No herding signal is included.
4. **Market commentary:** The prompt does not include editorial hints.
5. **Resolution hints:** No private information about likely outcomes is provided.

---

## Response Parsing

### Valid Response Examples

BET action:

```json
{
  "action": "BET",
  "bets": [
    {"market_id": "abc123", "side": "YES", "amount": 500}
  ],
  "reasoning": "The current price appears low relative to the event likelihood."
}
```

Multi-outcome BET action:

```json
{
  "action": "BET",
  "bets": [
    {"market_id": "multi123", "side": "Outcome Name", "amount": 250}
  ],
  "reasoning": "This outcome appears mispriced relative to the alternatives."
}
```

SELL action:

```json
{
  "action": "SELL",
  "sells": [
    {"position_id": "xyz789", "percentage": 100}
  ],
  "reasoning": "Taking profits after the position moved favorably."
}
```

HOLD action:

```json
{
  "action": "HOLD",
  "reasoning": "No available market offers a favorable allocation at current prices."
}
```

### Error Handling

If a response cannot be parsed or validated:

1. Retry once with the retry prompt.
2. If still invalid, default to `HOLD`.
3. Log the error and retry count.
4. Preserve the model response for audit.

---

## Version History

| Version | Changes |
|---------|---------|
| v1 | Initial prompt design with dual Brier/P&L framing |
| v2 | Portfolio value is the primary score; bet size is capital allocation; multi-outcome sides are supported; Brier/implied-confidence scoring is not active methodology |
