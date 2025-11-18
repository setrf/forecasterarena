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
 * Fetch ALL active markets from Polymarket using pagination
 *
 * This function makes multiple API requests to fetch all available active markets.
 * The Polymarket API has a maximum of 100 markets per request, so we loop through
 * all pages until we've retrieved everything.
 *
 * Features:
 * - Automatic pagination (loops until no more markets)
 * - Rate limiting (500ms delay between requests to be respectful)
 * - Progress logging (so you know it's working on large datasets)
 *
 * @returns Array of ALL active markets from Polymarket
 *
 * @example
 * const allMarkets = await fetchAllPolymarketMarkets();
 * console.log(`Found ${allMarkets.length} total active markets`);
 */
export async function fetchAllPolymarketMarkets(): Promise<SimplifiedMarket[]> {
  const allMarkets: SimplifiedMarket[] = [];
  let offset = 0;
  const limit = 100; // Maximum allowed by Polymarket API
  let pageNumber = 1;

  console.log('📊 Fetching ALL active markets from Polymarket (this may take a moment)...');

  while (true) {
    try {
      // Fetch a batch of markets
      const batch = await fetchPolymarketMarkets(limit, offset);

      // No more markets to fetch
      if (batch.length === 0) {
        console.log(`✅ Finished! Fetched all ${allMarkets.length} active markets`);
        break;
      }

      // Add this batch to our collection
      allMarkets.push(...batch);
      console.log(`   Page ${pageNumber}: Fetched ${batch.length} markets (${allMarkets.length} total so far)`);

      // If we got fewer than the limit, we've reached the last page
      if (batch.length < limit) {
        console.log(`✅ Finished! Fetched all ${allMarkets.length} active markets`);
        break;
      }

      // Move to next page
      offset += limit;
      pageNumber++;

      // Rate limiting: Wait 500ms between requests to be respectful of API
      // This prevents overwhelming Polymarket's servers
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error fetching page ${pageNumber} (offset ${offset}):`, error);

      // If we've already fetched some markets, return what we have
      if (allMarkets.length > 0) {
        console.log(`⚠️  Returning ${allMarkets.length} markets fetched before error`);
        return allMarkets;
      }

      // Otherwise, re-throw the error
      throw error;
    }
  }

  return allMarkets;
}

/**
 * Fetch ALL closed markets from Polymarket for resolution checking
 *
 * This function fetches markets that have closed but not yet resolved.
 * Used by the resolution cron to check if closed markets have been decided.
 *
 * @param limit - Maximum number to fetch (default: 100)
 * @returns Array of closed markets
 *
 * @example
 * const closedMarkets = await fetchClosedPolymarketMarkets(50);
 */
export async function fetchClosedPolymarketMarkets(limit: number = 100): Promise<SimplifiedMarket[]> {
  const url = `${GAMMA_API_HOST}/markets`;
  const params = new URLSearchParams({
    active: 'false',      // NOT active
    closed: 'true',       // IS closed
    archived: 'false',    // NOT archived
    limit: limit.toString(),
    offset: '0'
  });

  try {
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
    }

    const markets: PolymarketMarket[] = await response.json();

    // Convert to simplified format
    return markets.map(market => {
      const yesToken = market.tokens.find(t => t.outcome === 'Yes');
      const currentPrice = yesToken ? parseFloat(yesToken.price) : 0.5;

      // Determine if resolved
      let status: 'active' | 'closed' | 'resolved' = 'closed';
      if (market.resolved || yesToken?.winner !== undefined) {
        status = 'resolved';
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
    });

  } catch (error) {
    console.error('Error fetching closed Polymarket markets:', error);
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
