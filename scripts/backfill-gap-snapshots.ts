/**
 * Backfill Portfolio Snapshots for Historical Data Gap
 *
 * Gap Period: Dec 8, 2025 00:00:02 → 19:10:01 (19 hours)
 * Cause: Schema migration from daily to 10-minute snapshots
 *
 * Strategy:
 * - No trades occurred during gap (verified via database query)
 * - Positions remained constant, only market prices changed
 * - Fetch historical prices from Polymarket CLOB API
 * - Reconstruct mark-to-market P&L at 10-minute intervals
 * - Insert missing snapshots into portfolio_snapshots table
 */

import { getDb } from '../lib/db/index';
import { v4 as uuidv4 } from 'uuid';

// Gap period boundaries (UTC)
const GAP_START = new Date('2025-12-08T00:00:02Z');
const GAP_END = new Date('2025-12-08T19:10:01Z');
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Polymarket API endpoints
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

interface Position {
  id: string;
  agent_id: string;
  market_id: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  polymarket_id: string;
  question: string;
}

interface Agent {
  id: string;
  name: string;
}

interface HistoricalPrice {
  t: number; // Unix timestamp
  p: number; // Price
}

interface MarketTokens {
  polymarket_id: string;
  token_ids: string[];
  outcomes: string[];
}

interface SnapshotData {
  agent_id: string;
  timestamp: Date;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
}

/**
 * Fetch market data from Polymarket Gamma API to get token IDs
 */
async function fetchMarketTokens(polymarketId: string): Promise<MarketTokens | null> {
  try {
    const response = await fetch(`${GAMMA_API}/markets/${polymarketId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch market ${polymarketId}: ${response.status}`);
      return null;
    }

    const market = await response.json();

    // Parse clobTokenIds (JSON string)
    let token_ids: string[] = [];
    if (market.clobTokenIds) {
      try {
        token_ids = JSON.parse(market.clobTokenIds);
      } catch (e) {
        console.error(`Failed to parse clobTokenIds for ${polymarketId}:`, e);
        return null;
      }
    }

    // Parse outcomes
    let outcomes: string[] = [];
    if (market.outcomes) {
      try {
        outcomes = typeof market.outcomes === 'string'
          ? JSON.parse(market.outcomes)
          : market.outcomes;
      } catch (e) {
        console.error(`Failed to parse outcomes for ${polymarketId}:`, e);
      }
    }

    return { polymarket_id: polymarketId, token_ids, outcomes };
  } catch (error) {
    console.error(`Error fetching market ${polymarketId}:`, error);
    return null;
  }
}

/**
 * Fetch historical prices from Polymarket CLOB API
 */
async function fetchHistoricalPrices(
  tokenId: string,
  startTs: number,
  endTs: number
): Promise<HistoricalPrice[]> {
  try {
    const url = new URL(`${CLOB_API}/prices-history`);
    url.searchParams.set('market', tokenId);
    url.searchParams.set('startTs', String(startTs));
    url.searchParams.set('endTs', String(endTs));
    url.searchParams.set('fidelity', '10'); // 10-minute intervals

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn(`Failed to fetch prices for token ${tokenId.slice(0, 20)}...: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error(`Error fetching prices for token ${tokenId.slice(0, 20)}...:`, error);
    return [];
  }
}

/**
 * Generate timestamps at 10-minute intervals
 */
function generateSnapshotTimestamps(): Date[] {
  const timestamps: Date[] = [];
  let current = new Date(GAP_START);

  while (current < GAP_END) {
    timestamps.push(new Date(current));
    current = new Date(current.getTime() + SNAPSHOT_INTERVAL_MS);
  }

  return timestamps;
}

/**
 * Find closest price to a given timestamp
 */
function findClosestPrice(prices: HistoricalPrice[], targetTs: number): number | null {
  if (prices.length === 0) return null;

  // Find closest timestamp
  let closest = prices[0];
  let minDiff = Math.abs(prices[0].t - targetTs);

  for (const price of prices) {
    const diff = Math.abs(price.t - targetTs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = price;
    }
  }

  // Only use if within 15 minutes (allow some tolerance)
  if (minDiff > 15 * 60) {
    return null;
  }

  return closest.p;
}

/**
 * Format timestamp as YYYY-MM-DD HH:MM:SS
 */
function formatTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  console.log('🔄 Starting portfolio snapshots backfill...\n');
  console.log(`Gap period: ${GAP_START.toISOString()} → ${GAP_END.toISOString()}`);

  const db = getDb();

  // Step 1: Get all agents (join with models to get name)
  const agents = db.prepare(`
    SELECT a.id, m.display_name as name
    FROM agents a
    JOIN models m ON a.model_id = m.id
  `).all() as Agent[];
  console.log(`\n📊 Found ${agents.length} agents\n`);

  // Step 2: Get ALL positions that could have existed during the gap
  // (opened before gap ended, regardless of when they were closed)
  const allPositionsQuery = db.prepare(`
    SELECT
      p.id, p.agent_id, p.market_id, p.side, p.shares,
      p.avg_entry_price, p.total_cost, p.opened_at, p.closed_at, p.status,
      m.polymarket_id, m.question
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.opened_at <= ?
    ORDER BY p.opened_at
  `);

  const allPositions = allPositionsQuery.all(
    formatTimestamp(GAP_END)
  ) as Array<Position & { opened_at: string; closed_at: string | null; status: string }>;

  console.log(`📈 Found ${allPositions.length} total positions (will filter per timestamp)\n`);

  // Step 3: Fetch market tokens and historical prices for each unique market
  const marketTokensCache = new Map<string, MarketTokens>();
  const historicalPricesCache = new Map<string, Map<string, HistoricalPrice[]>>();

  const uniqueMarkets = Array.from(new Set(allPositions.map(p => p.polymarket_id)));
  console.log(`🔍 Fetching token IDs for ${uniqueMarkets.length} unique markets...`);

  const startTs = Math.floor(GAP_START.getTime() / 1000);
  const endTs = Math.floor(GAP_END.getTime() / 1000);

  for (const polymarketId of uniqueMarkets) {
    const tokens = await fetchMarketTokens(polymarketId);
    if (!tokens || tokens.token_ids.length === 0) {
      console.warn(`⚠️  No token IDs found for market ${polymarketId}`);
      continue;
    }

    marketTokensCache.set(polymarketId, tokens);

    // Fetch historical prices for each token
    const pricesMap = new Map<string, HistoricalPrice[]>();
    for (let i = 0; i < tokens.token_ids.length; i++) {
      const tokenId = tokens.token_ids[i];
      const outcome = tokens.outcomes[i] || `outcome_${i}`;

      console.log(`  📥 Fetching prices for ${outcome} token...`);
      const prices = await fetchHistoricalPrices(tokenId, startTs, endTs);

      if (prices.length > 0) {
        pricesMap.set(outcome.toUpperCase(), prices);
        console.log(`     ✅ Got ${prices.length} price points`);
      } else {
        console.warn(`     ⚠️  No prices found`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    historicalPricesCache.set(polymarketId, pricesMap);
  }

  console.log(`\n✅ Fetched historical prices for ${historicalPricesCache.size} markets\n`);

  // Step 4: Generate snapshots for each agent at 10-minute intervals
  const timestamps = generateSnapshotTimestamps();
  console.log(`📅 Generating ${timestamps.length} snapshots per agent...\n`);

  const insertSnapshot = db.prepare(`
    INSERT OR IGNORE INTO portfolio_snapshots (
      id, agent_id, snapshot_timestamp, cash_balance, positions_value,
      total_value, total_pnl, total_pnl_percent, brier_score, num_resolved_bets
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;

  for (const agent of agents) {
    console.log(`\n👤 Processing ${agent.name}...`);

    // Get current cash from agents table (authoritative source, always up-to-date)
    const currentAgent = db.prepare(`
      SELECT cash_balance FROM agents WHERE id = ?
    `).get(agent.id) as { cash_balance: number } | undefined;

    const currentCash = currentAgent?.cash_balance || 10000;

    // Get all agent's positions (we'll filter per timestamp below)
    const agentAllPositions = allPositions.filter(p => p.agent_id === agent.id);
    console.log(`  📋 Agent has ${agentAllPositions.length} total positions across gap period`);

    // Generate snapshots for each timestamp
    for (const timestamp of timestamps) {
      const timestampUnix = Math.floor(timestamp.getTime() / 1000);
      const timestampStr = formatTimestamp(timestamp);

      // Calculate cash at this timestamp by adding back costs of positions opened after it
      let cashBalance = currentCash;
      const positionsOpenedAfter = agentAllPositions.filter(p => p.opened_at > timestampStr);
      for (const pos of positionsOpenedAfter) {
        cashBalance += pos.total_cost;
      }

      // Filter positions that existed at this specific timestamp
      const agentPositions = agentAllPositions.filter(p => {
        const openedBefore = p.opened_at <= timestampStr;
        const notClosedYet = p.status === 'open' || (p.closed_at && p.closed_at > timestampStr);
        return openedBefore && notClosedYet;
      });

      let positionsValue = 0;

      // Calculate positions value at this timestamp
      for (const position of agentPositions) {
        const pricesMap = historicalPricesCache.get(position.polymarket_id);
        if (!pricesMap) {
          // Use current value if no historical prices available
          positionsValue += position.total_cost;
          continue;
        }

        const sidePrices = pricesMap.get(position.side.toUpperCase());
        if (!sidePrices || sidePrices.length === 0) {
          // Use current value if no prices for this side
          positionsValue += position.total_cost;
          continue;
        }

        const price = findClosestPrice(sidePrices, timestampUnix);
        if (price !== null) {
          positionsValue += position.shares * price;
        } else {
          // Fallback to total cost
          positionsValue += position.total_cost;
        }
      }

      const totalValue = cashBalance + positionsValue;
      const totalPnl = totalValue - 10000; // Assuming $10k starting balance
      const totalPnlPercent = (totalPnl / 10000) * 100;

      // Insert snapshot
      insertSnapshot.run(
        uuidv4(),
        agent.id,
        formatTimestamp(timestamp),
        cashBalance,
        positionsValue,
        totalValue,
        totalPnl,
        totalPnlPercent,
        null, // brier_score (not calculated for backfill)
        0     // num_resolved_bets (not calculated for backfill)
      );

      totalInserted++;
    }

    console.log(`  ✅ Inserted ${timestamps.length} snapshots`);
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`📊 Total snapshots inserted: ${totalInserted}`);
  console.log(`\n🔍 Verification:`);

  const verifyCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM portfolio_snapshots
    WHERE snapshot_timestamp >= ? AND snapshot_timestamp <= ?
  `).get(formatTimestamp(GAP_START), formatTimestamp(GAP_END)) as { count: number };

  console.log(`   Snapshots in gap period: ${verifyCount.count}`);
  console.log(`   Expected: ${timestamps.length * agents.length}`);

  if (verifyCount.count === timestamps.length * agents.length) {
    console.log(`\n✨ Success! Gap has been filled with historical data.`);
  } else {
    console.log(`\n⚠️  Warning: Snapshot count mismatch. Please verify.`);
  }
}

main().catch(error => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
