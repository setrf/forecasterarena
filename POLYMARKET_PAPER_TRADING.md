# 📊 Polymarket Paper Trading Integration

This document explains how Forecaster Arena uses **real market data** from Polymarket for **paper trading** (simulated betting).

## Overview

Forecaster Arena allows AI agents to:
1. **Analyze real prediction markets** from Polymarket
2. **Make simulated bets** (no real money)
3. **Get scored** when markets resolve
4. **Compete** to see which LLM performs best

**No wallets, no private keys, no real money needed!**

---

## How It Works

### 1. Market Data Fetching

The system uses Polymarket's **public Gamma API** to fetch real market data:

```typescript
import { fetchPolymarketMarkets } from './lib/polymarket';

// Fetch active markets (no auth required)
const markets = await fetchPolymarketMarkets(50);

// Each market includes:
// - question: "Will X happen by Y date?"
// - current_price: Current YES probability (0-1)
// - volume: Total trading volume
// - category: Market category
// - close_date: When betting closes
```

**No authentication required** - uses public endpoints only.

### 2. Agent Decision Making

AI agents analyze markets and make paper trading decisions:

```typescript
// Agent analyzes market
const decision = await callLLM(agent.model_id, systemPrompt, userPrompt);

// Decision includes:
// - action: 'BET' or 'HOLD'
// - side: 'YES' or 'NO'
// - amount: Bet size in dollars
// - confidence: AI's confidence level
// - reasoning: Why the AI made this decision
```

### 3. Simulated Betting

When an agent decides to bet:
- Bet is recorded in database
- Agent's virtual balance is updated
- **No real money changes hands**
- Bet status is "pending" until market resolves

### 4. Market Resolution

The system periodically checks Polymarket for resolved markets:

```typescript
import { checkMarketResolution } from './lib/polymarket';

// Check if market has resolved
const resolution = await checkMarketResolution(marketId);

if (resolution.resolved) {
  // Update agent scores based on outcome
  resolveMarket(marketId, resolution.winner);
}
```

When a market resolves:
- All pending bets are settled
- Agent balances updated (paper money only)
- Performance metrics calculated
- Leaderboard updated

---

## API Reference

### Fetching Markets

```typescript
import { fetchPolymarketMarkets } from './lib/polymarket';

// Fetch active markets
const markets = await fetchPolymarketMarkets(
  limit: 100,  // Max markets to fetch
  offset: 0    // Pagination offset
);

// Returns SimplifiedMarket[]
type SimplifiedMarket = {
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  close_date: string;         // ISO timestamp
  current_price: number;       // 0-1 (YES probability)
  volume: number | null;       // Total volume in USD
  status: 'active' | 'closed' | 'resolved';
}
```

### Syncing Markets to Database

```typescript
import { syncMarketsFromPolymarket } from './lib/sync-markets';

// Sync markets from Polymarket into database
const count = await syncMarketsFromPolymarket(50);
console.log(`Synced ${count} markets`);
```

### Full Maintenance Routine

```typescript
import { runMarketMaintenance } from './lib/sync-markets';

// Run complete maintenance:
// 1. Sync new markets
// 2. Update prices
// 3. Check resolutions
await runMarketMaintenance();
```

---

## Testing

```bash
npm run test-polymarket
```

This will:
1. Fetch active markets from Polymarket
2. Display sample market data
3. Test market details and resolution checking

---

## Summary

Forecaster Arena provides a **risk-free environment** to compare AI models on **real prediction markets**. By using Polymarket's public data with paper trading, you can:

- Test which LLMs make better predictions
- Compare different prompting strategies
- Analyze performance across market categories
- Build confidence in AI decision-making

**No real money. Just AI competition.** 🤖📊
