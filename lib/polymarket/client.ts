/**
 * Polymarket API Client
 * 
 * Client for interacting with Polymarket's Gamma API.
 * The Gamma API is public and requires no authentication.
 * 
 * @see https://docs.polymarket.com/
 * @module polymarket/client
 */

import { POLYMARKET_GAMMA_API_HOST, TOP_MARKETS_COUNT } from '../constants';
import type { PolymarketMarket, PolymarketEvent, SimplifiedMarket, MarketResolution } from './types';

/**
 * Fetch markets from Polymarket Gamma API
 */
export async function fetchMarkets(
  limit: number = TOP_MARKETS_COUNT,
  offset: number = 0
): Promise<PolymarketMarket[]> {
  const url = new URL(`${POLYMARKET_GAMMA_API_HOST}/markets`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('active', 'true');
  url.searchParams.set('closed', 'false');
  // Use volumeNum for proper volume sorting (API quirk)
  url.searchParams.set('order', 'volumeNum');
  url.searchParams.set('ascending', 'false');
  
  console.log(`Fetching markets from Polymarket: ${url}`);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const markets = Array.isArray(data) ? data : data.markets || [];
  
  console.log(`Fetched ${markets.length} markets from Polymarket`);
  
  return markets as PolymarketMarket[];
}

/**
 * Fetch a single market by ID
 */
export async function fetchMarketById(marketId: string): Promise<PolymarketMarket | null> {
  const url = `${POLYMARKET_GAMMA_API_HOST}/markets/${marketId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json() as PolymarketMarket;
}

/**
 * Transform Polymarket market to our simplified format
 * 
 * Note: Polymarket API returns outcomes and prices as JSON strings:
 * - outcomes: '["Yes", "No"]'
 * - outcomePrices: '["0.42", "0.58"]'
 */
export function simplifyMarket(market: PolymarketMarket): SimplifiedMarket {
  // Parse outcomes and prices from JSON strings (actual API format)
  let outcomesList: string[] = [];
  let pricesList: string[] = [];
  
  try {
    // Handle both formats: JSON string or array
    if (typeof market.outcomes === 'string') {
      outcomesList = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes)) {
      outcomesList = market.outcomes;
    }
    
    if (typeof market.outcomePrices === 'string') {
      pricesList = JSON.parse(market.outcomePrices);
    } else if (Array.isArray(market.outcomePrices)) {
      pricesList = market.outcomePrices;
    }
  } catch {
    // Fall back to tokens array if parsing fails
    const tokens = market.tokens || [];
    outcomesList = tokens.map(t => t.outcome).filter(Boolean);
    pricesList = tokens.map(t => t.price).filter(Boolean);
  }
  
  const isBinary = outcomesList.length === 2 && 
    outcomesList.some(o => o?.toLowerCase() === 'yes') &&
    outcomesList.some(o => o?.toLowerCase() === 'no');
  
  let currentPrice: number | null = null;
  let currentPrices: string | null = null;
  
  if (outcomesList.length > 0 && pricesList.length > 0) {
    if (isBinary) {
      // Find YES price
      const yesIndex = outcomesList.findIndex(o => o?.toLowerCase() === 'yes');
      if (yesIndex !== -1 && pricesList[yesIndex]) {
        currentPrice = parseFloat(pricesList[yesIndex]);
        // Ensure price is valid (between 0 and 1)
        if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
          currentPrice = null;
        }
      }
    } else {
      // Multi-outcome: create price map
      const prices: Record<string, number> = {};
      for (let i = 0; i < outcomesList.length; i++) {
        if (outcomesList[i] && pricesList[i]) {
          const price = parseFloat(pricesList[i]);
          if (!isNaN(price) && price >= 0 && price <= 1) {
            prices[outcomesList[i]] = price;
          }
        }
      }
      currentPrices = Object.keys(prices).length > 0 ? JSON.stringify(prices) : null;
    }
  }
  
  let status: 'active' | 'closed' | 'resolved' = 'active';
  if (market.resolved) status = 'resolved';
  else if (market.closed) status = 'closed';
  
  const outcomes = !isBinary && outcomesList.length > 0
    ? JSON.stringify(outcomesList)
    : null;
  
  // Handle different date field names from API
  // IMPORTANT: Don't default to now - log warning if date is missing
  let closeDate = market.end_date_iso || market.endDateIso || market.endDate;
  
  if (!closeDate) {
    console.warn(
      `[Market ${market.id}] No close date found. Question: "${market.question?.slice(0, 50)}...". ` +
      `Using far-future date as placeholder.`
    );
    // Use far-future date instead of "now" to avoid premature market closing
    closeDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now
  }
  
  // Get event slug (for multi-outcome markets, the event slug is what links to Polymarket)
  const eventSlug = market.events?.[0]?.slug || null;
  
  return {
    polymarket_id: market.id || market.conditionId || '',
    slug: market.slug || null,
    event_slug: eventSlug,
    question: market.question || 'Unknown question',
    description: market.description || null,
    category: market.category || null,
    market_type: isBinary ? 'binary' : 'multi_outcome',
    outcomes,
    close_date: closeDate,
    status,
    current_price: currentPrice,
    current_prices: currentPrices,
    // Prefer volumeNum (numeric) over volume (string) for accuracy
    volume: market.volumeNum ?? (market.volume ? parseFloat(String(market.volume)) : null),
    liquidity: market.liquidity ? parseFloat(String(market.liquidity)) : null,
  };
}

/**
 * Check if a market has resolved
 * 
 * IMPORTANT: Newer markets may not have a `tokens` array and instead use
 * `outcomes` and `outcomePrices` as JSON strings. We handle both formats.
 */
export function checkResolution(market: PolymarketMarket): MarketResolution {
  if (!market.resolved) return { resolved: false };
  
  // Method 1: Check tokens array (older format)
  if (market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0) {
    // Look for winner flag
    const winnerToken = market.tokens.find(t => t.winner === true);
    if (winnerToken && winnerToken.outcome) {
      return { resolved: true, winner: winnerToken.outcome.toUpperCase() };
    }
    
    // Fallback: look for price = 1 (winning outcome)
    const winnerByPrice = market.tokens.find(t => {
      const price = parseFloat(t.price || '0');
      return price === 1 || price >= 0.99;
    });
    if (winnerByPrice && winnerByPrice.outcome) {
      return { resolved: true, winner: winnerByPrice.outcome.toUpperCase() };
    }
  }
  
  // Method 2: Check outcomePrices (newer format - JSON string)
  if (market.outcomePrices) {
    try {
      const outcomes = typeof market.outcomes === 'string' 
        ? JSON.parse(market.outcomes) 
        : market.outcomes || [];
      const prices = typeof market.outcomePrices === 'string' 
        ? JSON.parse(market.outcomePrices) 
        : market.outcomePrices || [];
      
      if (Array.isArray(outcomes) && Array.isArray(prices)) {
        for (let i = 0; i < prices.length; i++) {
          const price = parseFloat(prices[i]);
          if (price === 1 || price >= 0.99) {
            const winner = outcomes[i];
            if (winner) {
              return { resolved: true, winner: winner.toUpperCase() };
            }
          }
        }
      }
    } catch (e) {
      console.error('Error parsing outcomePrices for resolution:', e);
    }
  }
  
  // Market is resolved but we couldn't determine winner
  console.warn(`Market ${market.id} is resolved but winner could not be determined`);
  return { resolved: false };
}

/**
 * Fetch events from Polymarket Gamma API
 * Events contain groups of related markets (e.g., "Top Spotify Artist 2025" contains all artist sub-markets)
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function fetchEvents(
  limit: number = 100,
  offset: number = 0
): Promise<PolymarketEvent[]> {
  const url = new URL(`${POLYMARKET_GAMMA_API_HOST}/events`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('order', 'volume');
  url.searchParams.set('ascending', 'false');
  url.searchParams.set('closed', 'false');
  
  console.log(`Fetching events from Polymarket: ${url}`);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch event by slug
 * Slug can be extracted from Polymarket URL: polymarket.com/event/{slug}
 */
export async function fetchEventBySlug(slug: string): Promise<PolymarketEvent | null> {
  const url = `${POLYMARKET_GAMMA_API_HOST}/events/slug/${slug}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Fetch all markets from events (recommended approach per docs)
 * This extracts individual markets from events for better coverage
 * 
 * IMPORTANT: Some events have duplicate slugs (e.g., "top-spotify-artist-2025" and 
 * "top-spotify-artist-2025-146"). Only the one with volume has active markets.
 * 
 * @see https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
 */
export async function fetchMarketsFromEvents(limit: number = 100): Promise<PolymarketMarket[]> {
  const events = await fetchEvents(limit);
  const allMarkets: PolymarketMarket[] = [];
  
  for (const event of events) {
    if (event.markets && Array.isArray(event.markets)) {
      for (const market of event.markets) {
        // Only include active, non-closed markets with volume > 0
        // Markets with active=true AND volumeNum > 0 are actually tradeable
        const volumeNum = parseFloat(String(market.volumeNum || market.volume || 0));
        if (market.active === true && !market.closed && volumeNum > 0) {
          allMarkets.push(market);
        }
      }
    }
  }
  
  console.log(`Extracted ${allMarkets.length} active markets from ${events.length} events`);
  return allMarkets;
}

/**
 * Fetch and simplify top markets by volume
 * Uses both direct markets endpoint and events endpoint for better coverage
 * 
 * Events can contain 20-100+ markets each (e.g., "Top Spotify Artist 2025" has 36 markets)
 * so we fetch more events to ensure good coverage.
 */
export async function fetchTopMarkets(limit: number = TOP_MARKETS_COUNT): Promise<SimplifiedMarket[]> {
  // Fetch from both sources for maximum coverage
  // Events are fetched with higher limit since each event contains many markets
  const [directMarkets, eventMarkets] = await Promise.all([
    fetchMarkets(limit),
    fetchMarketsFromEvents(Math.max(50, limit)) // Fetch at least 50 events for good coverage
  ]);
  
  // Combine and deduplicate by polymarket_id
  const seen = new Set<string>();
  const allMarkets: PolymarketMarket[] = [];
  
  for (const market of [...directMarkets, ...eventMarkets]) {
    const id = market.id || market.conditionId || '';
    if (id && !seen.has(id)) {
      seen.add(id);
      allMarkets.push(market);
    }
  }
  
  // Sort by volume and take top N
  // IMPORTANT: Prefer volumeNum (numeric) over volume (string) to avoid string comparison bugs
  allMarkets.sort((a, b) => {
    const volA = a.volumeNum ?? (a.volume ? parseFloat(String(a.volume)) : 0);
    const volB = b.volumeNum ?? (b.volume ? parseFloat(String(b.volume)) : 0);
    return volB - volA;
  });
  
  return allMarkets.slice(0, limit).map(simplifyMarket);
}

/**
 * Check resolution status for multiple markets
 */
export async function checkMultipleResolutions(
  polymarketIds: string[]
): Promise<Map<string, MarketResolution>> {
  const results = new Map<string, MarketResolution>();
  const batchSize = 10;
  
  for (let i = 0; i < polymarketIds.length; i += batchSize) {
    const batch = polymarketIds.slice(i, i + batchSize);
    
    const promises = batch.map(async (id) => {
      try {
        const market = await fetchMarketById(id);
        if (market) results.set(id, checkResolution(market));
      } catch (error) {
        console.error(`Error checking resolution for ${id}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    if (i + batchSize < polymarketIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

