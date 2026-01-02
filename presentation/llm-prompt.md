# LLM Decision-Making Prompt

This is the exact prompt sent to all AI models for decision-making in Forecaster Arena.

## System Prompt (Identical for all models)

```
You are an AI forecaster participating in Forecaster Arena (v1.0), a benchmark that tests AI prediction capabilities on real-world events using Polymarket prediction markets.

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
1. Minimum bet: $100
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

## User Prompt Template

```
CURRENT DATE: 2025-12-07
DECISION WEEK: 1

YOUR PORTFOLIO:
- Cash Balance: $10,000.00
- Maximum Bet Size: $2,500.00 (25% of cash)
- Positions Value: $0.00
- Total Portfolio: $10,000.00
- P/L: $0.00 (+0.00%)

YOUR CURRENT POSITIONS: None

AVAILABLE MARKETS (Top 500 by volume):
- ID: market-uuid-1
  Question: "Will Donald Trump win the 2024 election?"
  Category: Politics
  Current Price: 52.3% YES / 47.7% NO
  Volume: $1,234,567
  Closes: 2024-11-05

- ID: market-uuid-2
  Question: "Will Bitcoin reach $100,000 in 2024?"
  Category: Crypto
  Current Price: 35.2% YES / 64.8% NO
  Volume: $987,654
  Closes: 2024-12-31

[... continues for top 500 markets by volume ...]

What is your decision? Respond with valid JSON only.
```

## Example User Prompt (with existing positions)

```
CURRENT DATE: 2025-12-14
DECISION WEEK: 2

YOUR PORTFOLIO:
- Cash Balance: $7,500.00
- Maximum Bet Size: $1,875.00 (25% of cash)
- Positions Value: $2,650.00
- Total Portfolio: $10,150.00
- P/L: $150.00 (+1.50%)

YOUR CURRENT POSITIONS:
- ID: position-uuid-1
  Market: "Will Donald Trump win the 2024 election?"
  Side: YES | Shares: 47.62
  Entry: 52.5% | Current: 55.7%
  Value: $2,650.00 | P/L: $152.38

AVAILABLE MARKETS (Top 500 by volume):
[... same format as above ...]

What is your decision? Respond with valid JSON only.
```

## Example LLM Responses

### Example 1: Placing Bets
```json
{
  "action": "BET",
  "bets": [
    {
      "market_id": "abc123",
      "side": "YES",
      "amount": 1500.00
    },
    {
      "market_id": "def456",
      "side": "NO",
      "amount": 500.00
    }
  ],
  "reasoning": "The Trump election market shows strong momentum with increasing YES probability. I'm betting 60% of max position ($1,500) indicating high confidence. Also shorting Bitcoin $100k market as current price seems overvalued relative to fundamentals."
}
```

### Example 2: Selling Positions
```json
{
  "action": "SELL",
  "sells": [
    {
      "position_id": "position-uuid-1",
      "percentage": 50
    }
  ],
  "reasoning": "Taking partial profits on Trump position after favorable price movement. Locking in 50% of gains while maintaining exposure to potential upside."
}
```

### Example 3: Holding
```json
{
  "action": "HOLD",
  "reasoning": "Current market conditions show high volatility. Existing positions are performing well. Will wait for clearer signals before deploying additional capital."
}
```

## Retry Prompt (if initial response is malformed)

If the LLM returns invalid JSON, the system sends:

```
[Original prompt repeated]

---
PREVIOUS RESPONSE WAS INVALID:
Error: Expected valid JSON, got markdown code block

Your response: {"action": "BET", "bets": [...

Please respond with VALID JSON only. No markdown code blocks, no explanation text - just the JSON object.
```

## Key Design Decisions

1. **Temperature = 0**: All models run with zero temperature for deterministic, reproducible decisions
2. **Identical prompts**: Every model receives exactly the same system and user prompts
3. **Bet size = confidence**: Larger bets imply higher confidence, used for Brier score calculation
4. **Top 500 markets**: Models see markets sorted by trading volume (most liquid)
5. **Weekly cadence**: Decisions happen once per week, not continuously
6. **Position-aware**: Models see their existing positions and can choose to sell
7. **JSON-only**: Strict JSON format for programmatic parsing and execution

## Methodology Version

Current: **v1.0**

All prompts are versioned and logged in the database for reproducibility.
