# 🎯 Polymarket Integration Guide

Complete guide to integrating real Polymarket trading into Forecaster Arena.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Authentication Flow](#authentication-flow)
5. [Fetching Markets](#fetching-markets)
6. [Placing Bets](#placing-bets)
7. [Testing](#testing)
8. [Common Pitfalls](#common-pitfalls)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

### 1. Polygon Wallet Setup

**Create a wallet:**
- MetaMask, Coinbase Wallet, or any Web3 wallet
- **Add Polygon network** (Chain ID: 137)
- **Export your private key** (Settings → Security → Reveal Private Key)
- ⚠️ **NEVER share or commit your private key!**

**Fund your wallet:**
```
1. Get USDC on Polygon
   - Bridge from Ethereum using https://wallet.polygon.technology/
   - Or buy directly on Polygon exchanges

2. Get MATIC for gas
   - Need ~0.1-0.5 MATIC for transaction fees
   - Get from Polygon faucet or exchange
```

### 2. Polymarket Account

**CRITICAL FIRST STEP:**
1. Go to https://polymarket.com
2. Connect your wallet
3. **Make at least ONE manual trade** (can be $1)
4. This initializes your account in Polymarket's system
5. ⚠️ **API trading will NOT work without this step!**

### 3. Get Your Profile Address

**Your "funder address" is your Polymarket profile address:**
1. Go to your Polymarket profile
2. Copy the address from the URL: `polymarket.com/profile/0x...`
3. This is different from your wallet address!
4. Save this as `POLYMARKET_FUNDER_ADDRESS`

---

## Installation

### 1. Install Required Packages

```bash
npm install @polymarket/clob-client ethers@5
```

**Important:** Must use ethers v5, not v6!

### 2. Update package.json

```json
{
  "dependencies": {
    "@polymarket/clob-client": "^latest",
    "ethers": "^5.7.2"
  }
}
```

---

## Configuration

### 1. Environment Variables

Add to `.env.local`:

```env
# ===== POLYMARKET CONFIGURATION =====

# Your Polygon wallet private key (starts with 0x)
# Export from MetaMask: Settings → Security → Export Private Key
# NEVER commit this to git!
POLYGON_WALLET_PRIVATE_KEY=0x1234...

# Your Polymarket profile address (not your wallet address!)
# Found at: polymarket.com/profile/YOUR_ADDRESS
POLYMARKET_FUNDER_ADDRESS=0xabcd...

# Optional: Enable Polymarket integration
ENABLE_POLYMARKET=false  # Set to true when ready for real trading
```

### 2. Update .gitignore

Ensure `.env.local` is gitignored:

```gitignore
# Environment files
.env*.local
.env
```

---

## Authentication Flow

### How Polymarket Authentication Works

```
1. User's Polygon Wallet
   ↓
2. Sign EIP-712 message
   ↓
3. Server derives API credentials from signature
   ↓
4. Credentials include: API Key, Secret, Passphrase
   ↓
5. Use credentials for all API calls
```

### Code Example

```typescript
import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from '@ethersproject/wallet';

const host = 'https://clob.polymarket.com';
const chainId = 137; // Polygon
const privateKey = process.env.POLYGON_WALLET_PRIVATE_KEY;
const funder = process.env.POLYMARKET_FUNDER_ADDRESS;

// Create signer
const signer = new Wallet(privateKey);

// Generate API credentials (deterministic - safe to call multiple times)
const tempClient = new ClobClient(host, chainId, signer);
const credentials = await tempClient.createOrDeriveApiKey();

// Initialize authenticated client
const client = new ClobClient(
  host,
  chainId,
  signer,
  credentials,
  0, // signatureType: 0 = browser wallet, 1 = Magic/email
  funder
);

console.log('✅ Polymarket client authenticated');
```

---

## Fetching Markets

### Using Gamma API (Read-Only, No Auth Required)

```typescript
const GAMMA_API = 'https://gamma-api.polymarket.com';

async function fetchMarkets(limit: number = 100) {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: limit.toString()
  });

  const response = await fetch(`${GAMMA_API}/markets?${params}`);
  const markets = await response.json();

  return markets;
}

// Usage
const markets = await fetchMarkets(10);
console.log(`Found ${markets.length} markets`);
console.log(markets[0]);
```

### Market Data Structure

```typescript
{
  "id": "market-id",
  "question": "Will Bitcoin be above $100,000 by end of 2024?",
  "description": "Market resolves YES if...",
  "end_date_iso": "2024-12-31T23:59:59Z",
  "tokens": [
    {
      "outcome": "Yes",
      "token_id": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
      "price": "0.45"  // 45% probability
    },
    {
      "outcome": "No",
      "token_id": "78257366856536093709430949844173758466932727263102385049511843152050061163545",
      "price": "0.55"  // 55% probability
    }
  ],
  "tick_size": "0.001",  // Minimum price increment
  "neg_risk": false,      // Market type parameter
  "liquidity": "1500000.50",
  "volume": "2500000.00",
  "category": "crypto"
}
```

### Important Fields

- **token_id**: Extremely long numbers (70+ digits). NEVER hardcode! Always fetch from API.
- **tick_size**: Minimum price increment (e.g., "0.001" = 0.1%)
- **neg_risk**: Market type parameter. Always pass exact value to order functions.
- **end_date_iso**: When market closes for trading

---

## Placing Bets

### Basic Order

```typescript
import { Side, OrderType } from '@polymarket/clob-client';

async function placeBet(
  client: ClobClient,
  market: any,
  outcome: 'Yes' | 'No',
  price: number,
  sizeUSD: number
) {
  // Get correct token
  const token = market.tokens.find(t => t.outcome === outcome);

  // Place limit order
  const order = await client.createAndPostOrder(
    {
      tokenID: token.token_id,
      price: price,           // e.g., 0.50 = 50%
      side: Side.BUY,
      size: sizeUSD          // e.g., 10.0 = $10
    },
    {
      tickSize: market.tick_size,
      negRisk: market.neg_risk
    },
    OrderType.GTC  // Good Till Canceled
  );

  console.log('✅ Order placed:', order.orderID);
  return order;
}

// Example: Bet $10 that Bitcoin hits $100k at 50% probability
const order = await placeBet(
  client,
  markets[0],
  'Yes',
  0.50,
  10.0
);
```

### Market Order (Buy at Best Available Price)

```typescript
// Market buy (takes best ask)
const orderbook = await client.getOrderBook(token.token_id);
const bestAsk = orderbook.asks[0].price;

const marketOrder = await client.createAndPostOrder(
  {
    tokenID: token.token_id,
    price: bestAsk,  // Take best ask price
    side: Side.BUY,
    size: 10.0
  },
  {
    tickSize: market.tick_size,
    negRisk: market.neg_risk
  },
  OrderType.FOK  // Fill Or Kill (executes immediately or cancels)
);
```

### Order Types

- **GTC** (Good Till Canceled): Stays on orderbook until filled or canceled
- **FOK** (Fill Or Kill): Executes immediately or cancels
- **GTD** (Good Till Date): Expires at specific time

---

## Testing

### Test Script

Create `scripts/test-polymarket.ts`:

```typescript
import { fetchPolymarketMarkets, initializePolymarketClient, getOrderbook } from '../lib/polymarket';

async function testPolymarket() {
  console.log('🧪 Testing Polymarket Integration\n');

  // 1. Test market fetching (no auth required)
  console.log('📊 Step 1: Fetching markets...');
  const markets = await fetchPolymarketMarkets(5);
  console.log(`✅ Found ${markets.length} markets`);
  console.log('Sample:', markets[0]?.question, '\n');

  // 2. Test authentication
  console.log('🔐 Step 2: Authenticating...');
  const client = await initializePolymarketClient();
  console.log('✅ Client initialized\n');

  // 3. Test orderbook fetching
  if (markets[0]) {
    console.log('📖 Step 3: Fetching orderbook...');
    const orderbook = await getOrderbook(client, markets[0].yes_token_id);
    console.log(`✅ Orderbook has ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`);
    console.log('Best bid:', orderbook.bids[0]);
    console.log('Best ask:', orderbook.asks[0], '\n');
  }

  // 4. Test order placement (COMMENTED OUT FOR SAFETY)
  /*
  console.log('💰 Step 4: Placing test order...');
  const result = await placePolymarketBet(
    client,
    markets[0].yes_token_id,
    'BUY',
    0.01,  // 1% probability (very unlikely to fill)
    1.0,   // $1 bet
    markets[0].tick_size,
    markets[0].neg_risk
  );
  console.log('Result:', result);
  */

  console.log('\n✅ All tests passed!');
}

testPolymarket().catch(console.error);
```

Run with:
```bash
npm install -g ts-node
ts-node scripts/test-polymarket.ts
```

---

## Common Pitfalls

### ❌ Problem: "Order rejected - insufficient allowance"

**Solution:**
```typescript
// Set token allowances before trading
await client.setAllowances();
```

### ❌ Problem: "Invalid price"

**Causes:**
- Price < 0.001 or > 0.999
- Price not a multiple of tickSize

**Solution:**
```typescript
// Round price to tick size
function roundToTickSize(price: number, tickSize: string): number {
  const tick = parseFloat(tickSize);
  return Math.round(price / tick) * tick;
}

const price = roundToTickSize(0.5234, "0.001"); // → 0.523
```

### ❌ Problem: "Account not found"

**Cause:** Never made a manual trade on Polymarket UI

**Solution:**
1. Go to https://polymarket.com
2. Connect wallet
3. Make ONE trade (can be $1)
4. Wait 1-2 minutes
5. Try API again

### ❌ Problem: "Insufficient balance"

**Causes:**
- Not enough USDC in wallet
- Not enough MATIC for gas

**Solution:**
```bash
# Check balances
# USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
# View on PolygonScan with your wallet address
```

### ❌ Problem: "Wrong network"

**Cause:** Sending USDC on Ethereum instead of Polygon

**Solution:**
- Bridge USDC to Polygon: https://wallet.polygon.technology/
- Or buy USDC directly on Polygon

---

## Production Checklist

### Security

- [ ] Private key stored in `.env.local` (gitignored)
- [ ] Never log private keys
- [ ] Use separate wallet for trading (not your main wallet)
- [ ] Set spending limits in contract allowances

### Risk Management

- [ ] Maximum bet size limits implemented
- [ ] Maximum total exposure limits
- [ ] Circuit breakers for repeated failures
- [ ] Graceful shutdown (cancel all orders on exit)

### Monitoring

- [ ] Log all orders placed
- [ ] Track win/loss ratio
- [ ] Monitor account balance
- [ ] Alert on low balance or errors
- [ ] Dashboard for real-time positions

### Testing

- [ ] Test with small amounts first ($1-5)
- [ ] Verify orders appear on Polymarket UI
- [ ] Test order cancellation
- [ ] Test different market types
- [ ] Monitor for 24 hours before scaling

### Compliance

- [ ] Understand legal requirements in your jurisdiction
- [ ] Prediction markets may be regulated
- [ ] Use responsibly and within limits
- [ ] Not financial advice

---

## Integration with Forecaster Arena

### Step 1: Update Database Schema

Add Polymarket-specific fields to markets table:

```sql
ALTER TABLE markets ADD COLUMN yes_token_id TEXT;
ALTER TABLE markets ADD COLUMN no_token_id TEXT;
ALTER TABLE markets ADD COLUMN tick_size TEXT DEFAULT '0.001';
ALTER TABLE markets ADD COLUMN neg_risk BOOLEAN DEFAULT false;
```

### Step 2: Sync Markets from Polymarket

Create `lib/polymarket-sync.ts`:

```typescript
import { fetchPolymarketMarkets } from './polymarket';
import { queries } from './database';

export async function syncPolymarketMarkets() {
  const markets = await fetchPolymarketMarkets(50);

  markets.forEach(market => {
    // Insert or update in database
    queries.upsertMarket({
      polymarket_id: market.polymarket_id,
      question: market.question,
      close_date: market.close_date,
      current_price: market.current_price,
      yes_token_id: market.yes_token_id,
      no_token_id: market.no_token_id,
      tick_size: market.tick_size,
      neg_risk: market.neg_risk
    });
  });

  console.log(`✅ Synced ${markets.length} markets from Polymarket`);
}
```

### Step 3: Place Real Bets in agents-sqlite.ts

Update `executeBet` function:

```typescript
import { initializePolymarketClient, placePolymarketBet } from './polymarket';

export async function executeBet(agent: any, decision: LLMDecision, market: any) {
  // ... existing code ...

  // Place bet in database (simulation)
  queries.insertBet({...});

  // Place REAL bet on Polymarket (if enabled)
  if (process.env.ENABLE_POLYMARKET === 'true') {
    try {
      const client = await initializePolymarketClient();

      const tokenId = decision.side === 'YES'
        ? market.yes_token_id
        : market.no_token_id;

      const result = await placePolymarketBet(
        client,
        tokenId,
        'BUY',
        market.current_price,
        decision.amount,
        market.tick_size,
        market.neg_risk
      );

      if (result.success) {
        console.log(`✅ Real bet placed on Polymarket: ${result.orderID}`);
        // Store orderID in database for tracking
      }
    } catch (error) {
      console.error('❌ Polymarket bet failed:', error);
      // Continue with simulation even if real bet fails
    }
  }
}
```

---

## Next Steps

1. **Start with simulation** - Test thoroughly with simulated bets
2. **Small real trades** - Start with $1-5 bets to verify
3. **Monitor closely** - Watch for 24-48 hours
4. **Scale gradually** - Increase bet sizes slowly
5. **Implement safeguards** - Add circuit breakers and limits

---

## Resources

**Official Documentation:**
- Polymarket Docs: https://docs.polymarket.com
- CLOB API: https://docs.polymarket.com/developers/CLOB/introduction
- Gamma API: https://docs.polymarket.com/developers/gamma-markets-api

**GitHub Repositories:**
- clob-client: https://github.com/Polymarket/clob-client
- Examples: https://github.com/Polymarket/clob-client/tree/main/examples
- AI Agents: https://github.com/Polymarket/agents

**Community Resources:**
- Polymarket Discord: https://discord.gg/polymarket
- API Tutorial: https://apidog.com/blog/polymarket-api/

---

**⚠️ IMPORTANT DISCLAIMER**

Polymarket trading involves real money and risk. This integration is for educational purposes. You are responsible for:
- Understanding prediction market risks
- Legal compliance in your jurisdiction
- All trading decisions and losses
- API costs and gas fees

Not financial advice. Trade at your own risk.
