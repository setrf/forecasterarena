# Prompt Design Documentation

This document contains the complete prompts used in Forecaster Arena for reproducibility.

---

## System Prompt

The system prompt establishes the LLM's role and decision format. It is identical for all models.

```
You are an AI forecaster participating in Forecaster Arena (v1), a benchmark that tests AI prediction capabilities on real-world events using Polymarket prediction markets.

YOUR OBJECTIVE:
Maximize your forecasting accuracy and portfolio returns by making intelligent bets on prediction markets.

DECISION FORMAT:
You must respond with valid JSON in exactly one of these formats:

FOR PLACING BETS:
{
  "action": "BET",
  "bets": [
    {
      "market_id": "uuid",
      "side": "YES" or "NO",
      "amount": 500.00
    }
  ],
  "reasoning": "Your detailed reasoning"
}

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
5. Bet size reflects confidence: larger bet = higher implied confidence

SCORING:
- Brier Score: Measures forecast accuracy (lower is better)
- Implied confidence = bet_amount / max_possible_bet
- A max bet (25% of balance) = 100% confidence
- Portfolio P/L also tracked

RESPOND WITH VALID JSON ONLY. No markdown, no explanation outside the JSON.
```

---

## User Prompt Template

The user prompt contains the current portfolio state and market information.

```
CURRENT DATE: {YYYY-MM-DD}
DECISION WEEK: {week_number}

YOUR PORTFOLIO:
- Cash Balance: ${cash_balance}
- Maximum Bet Size: ${max_bet} (25% of cash)
- Positions Value: ${positions_value}
- Total Portfolio: ${total_value}
- P/L: ${pnl} ({pnl_percent}%)

YOUR CURRENT POSITIONS:
- ID: {position_id}
  Market: "{market_question}"
  Side: {side} | Shares: {shares}
  Entry: {entry_price}% | Current: {current_price}%
  Value: ${value} | P/L: ${position_pnl}

AVAILABLE MARKETS (Top 100 by volume):
- ID: {market_id}
  Question: "{question}"
  Category: {category}
  Current Price: {yes_price}% YES / {no_price}% NO
  Volume: ${volume}
  Closes: {close_date}

What is your decision? Respond with valid JSON only.
```

---

## Retry Prompt

If the initial response is malformed, we retry once with this appended:

```
---
PREVIOUS RESPONSE WAS INVALID:
Error: {error_message}

Your response: {truncated_response}

Please respond with VALID JSON only. No markdown code blocks, no explanation text - just the JSON object.
```

---

## Design Rationale

### Why JSON Format?

1. **Structured output**: Easier to parse and validate
2. **Unambiguous actions**: Clear specification of what to do
3. **Reasoning capture**: Dedicated field for model's explanation
4. **Multiple actions**: Can batch multiple bets/sells

### Why Include Reasoning?

1. **Transparency**: Understand why decisions are made
2. **Analysis**: Compare reasoning quality across models
3. **Debugging**: Identify systematic errors in thinking
4. **Research**: Study how models approach forecasting

### Why Limit Market Information?

1. **Context window**: Too much data exceeds limits
2. **Focus**: Top 100 by volume are most liquid
3. **Fairness**: All models see the same information
4. **Simplicity**: Reduces noise from irrelevant markets

### Why Temperature = 0?

1. **Reproducibility**: Same input → same output
2. **Determinism**: Results can be verified
3. **Fair comparison**: Eliminates randomness between models
4. **Scientific rigor**: Enables meaningful comparison

---

## Information NOT Provided

To test genuine forecasting ability, we deliberately omit:

1. **Price history**: Only current price, no trends
2. **News context**: Models must rely on training knowledge
3. **Other models' decisions**: No herding effects
4. **Market commentary**: No hints about likely outcomes
5. **Resolution hints**: No information about probable outcomes

---

## Response Parsing

### Valid Response Examples

**BET action:**
```json
{
  "action": "BET",
  "bets": [
    {"market_id": "abc123", "side": "YES", "amount": 500}
  ],
  "reasoning": "Based on current polling data..."
}
```

**SELL action:**
```json
{
  "action": "SELL",
  "sells": [
    {"position_id": "xyz789", "percentage": 100}
  ],
  "reasoning": "Taking profits as the market has moved..."
}
```

**HOLD action:**
```json
{
  "action": "HOLD",
  "reasoning": "No compelling opportunities at current prices..."
}
```

### Error Handling

If response cannot be parsed:
1. Retry once with clarifying prompt
2. If still invalid, default to HOLD
3. Log error for analysis
4. Record both attempts

---

## Version History

| Version | Changes |
|---------|---------|
| v1 | Initial prompt design |


