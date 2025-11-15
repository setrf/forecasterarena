/**
 * Polymarket Market Data Integration
 *
 * Fetches real prediction market data from Polymarket's public Gamma API.
 * This allows our AI agents to make paper trading decisions on real markets.
 *
 * NO AUTHENTICATION REQUIRED - Uses public API only
 * NO REAL TRADING - Purely for market data fetching
 *
 * Official API: https://gamma-api.polymarket.com
 * Documentation: https://docs.polymarket.com
 */

// Polymarket API endpoints
const GAMMA_API_HOST = 'https://gamma-api.polymarket.com';

/**
 * Market data from Polymarket Gamma API
 */
export type PolymarketMarket = {
  id: string;
  question: string;
  description?: string;
  end_date_iso: string;
  tokens: Array<{
    outcome: string;
    token_id: string;
    price: string;
    winner?: boolean;
  }>;
  closed: boolean;
  archived: boolean;
  active: boolean;
  category?: string;
  liquidity?: string;
  volume?: string;
  resolving?: boolean;
  resolved?: boolean;
};

/**
 * Simplified market info for our database
 */
export type SimplifiedMarket = {
  polymarket_id: string;
  question: string;
  description: string | null;
  category: string | null;
  close_date: string;
  current_price: number; // YES token price (0-1)
  volume: number | null;
  status: 'active' | 'closed' | 'resolved';
};

/**
 * Fetch active markets from Polymarket Gamma API
 *
 * Uses public API (no authentication required) to get real prediction markets.
 * Agents will make paper trading decisions on these markets.
 *
 * @param limit - Maximum number of markets to fetch (default: 100)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of active markets
 */
export async function fetchPolymarketMarkets(
  limit: number = 100,
  offset: number = 0
): Promise<SimplifiedMarket[]> {
  const url = `${GAMMA_API_HOST}/markets`;
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    archived: 'false',
    limit: limit.toString(),
    offset: offset.toString()
  });

  try {
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const markets: PolymarketMarket[] = await response.json();

    // Convert to simplified format for our database
    return markets.map(market => {
      const yesToken = market.tokens.find(t => t.outcome === 'Yes');
      const currentPrice = yesToken ? parseFloat(yesToken.price) : 0.5;

      return {
        polymarket_id: market.id,
        question: market.question,
        description: market.description || null,
        category: market.category || null,
        close_date: market.end_date_iso,
        current_price: currentPrice,
        volume: market.volume ? parseFloat(market.volume) : null,
        status: 'active' as const
      };
    });

  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    throw error;
  }
}

/**
 * Fetch a single market by ID to check its current status
 *
 * Useful for updating market prices and checking resolution status.
 *
 * @param marketId - Polymarket market ID
 * @returns Market data or null if not found
 */
export async function fetchMarketById(marketId: string): Promise<SimplifiedMarket | null> {
  const url = `${GAMMA_API_HOST}/markets/${marketId}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const market: PolymarketMarket = await response.json();
    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');
    const currentPrice = yesToken ? parseFloat(yesToken.price) : 0.5;

    // Determine status
    let status: 'active' | 'closed' | 'resolved' = 'active';
    if (market.resolved || yesToken?.winner !== undefined) {
      status = 'resolved';
    } else if (market.closed || !market.active) {
      status = 'closed';
    }

    return {
      polymarket_id: market.id,
      question: market.question,
      description: market.description || null,
      category: market.category || null,
      close_date: market.end_date_iso,
      current_price: currentPrice,
      volume: market.volume ? parseFloat(market.volume) : null,
      status
    };

  } catch (error) {
    console.error(`Error fetching market ${marketId}:`, error);
    return null;
  }
}

/**
 * Check if a market has been resolved and get the winning outcome
 *
 * @param marketId - Polymarket market ID
 * @returns { resolved: boolean, winner?: 'YES' | 'NO' }
 */
export async function checkMarketResolution(marketId: string): Promise<{
  resolved: boolean;
  winner?: 'YES' | 'NO';
}> {
  const url = `${GAMMA_API_HOST}/markets/${marketId}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return { resolved: false };
    }

    const market: PolymarketMarket = await response.json();

    const yesToken = market.tokens.find(t => t.outcome === 'Yes');
    const noToken = market.tokens.find(t => t.outcome === 'No');

    // Check if market is resolved
    if (market.resolved || yesToken?.winner !== undefined || noToken?.winner !== undefined) {
      const winner = yesToken?.winner ? 'YES' : noToken?.winner ? 'NO' : undefined;
      return {
        resolved: true,
        winner
      };
    }

    return { resolved: false };

  } catch (error) {
    console.error(`Error checking resolution for market ${marketId}:`, error);
    return { resolved: false };
  }
}

/**
 * Example usage function (for testing)
 *
 * Demonstrates fetching markets from Polymarket.
 *
 * @example
 * ```typescript
 * await testPolymarketIntegration();
 * ```
 */
export async function testPolymarketIntegration() {
  try {
    console.log('📊 Fetching markets from Polymarket...');
    const markets = await fetchPolymarketMarkets(10);
    console.log(`✅ Found ${markets.length} active markets`);

    if (markets.length > 0) {
      const market = markets[0];
      console.log('\nSample Market:');
      console.log(`  Question: ${market.question}`);
      console.log(`  Category: ${market.category || 'N/A'}`);
      console.log(`  Close Date: ${new Date(market.close_date).toLocaleDateString()}`);
      console.log(`  Current YES Price: ${(market.current_price * 100).toFixed(1)}%`);
      console.log(`  Volume: $${market.volume ? market.volume.toLocaleString() : 'N/A'}`);
      console.log(`  Status: ${market.status}`);

      // Test fetching single market
      console.log('\n📋 Fetching market details...');
      const details = await fetchMarketById(market.polymarket_id);
      if (details) {
        console.log(`✅ Market details retrieved`);
        console.log(`  Current Price: ${(details.current_price * 100).toFixed(1)}%`);
      }
    }

    console.log('\n✅ Polymarket integration test completed successfully!');
    console.log('   Market data can be used for paper trading.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
