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
import type { PolymarketMarket, SimplifiedMarket, MarketResolution } from './types';

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
  url.searchParams.set('order', 'volume');
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
  const closeDate = market.end_date_iso || market.endDateIso || market.endDate || new Date().toISOString();
  
  return {
    polymarket_id: market.id || market.conditionId || '',
    question: market.question || 'Unknown question',
    description: market.description || null,
    category: market.category || null,
    market_type: isBinary ? 'binary' : 'multi_outcome',
    outcomes,
    close_date: closeDate,
    status,
    current_price: currentPrice,
    current_prices: currentPrices,
    volume: market.volume ? parseFloat(String(market.volume)) : null,
    liquidity: market.liquidity ? parseFloat(String(market.liquidity)) : null,
  };
}

/**
 * Check if a market has resolved
 */
export function checkResolution(market: PolymarketMarket): MarketResolution {
  if (!market.resolved) return { resolved: false };
  
  const winnerToken = market.tokens.find(t => t.winner === true);
  if (winnerToken) {
    return { resolved: true, winner: winnerToken.outcome.toUpperCase() };
  }
  
  const winnerByPrice = market.tokens.find(t => parseFloat(t.price) === 1);
  return { resolved: true, winner: winnerByPrice?.outcome.toUpperCase() };
}

/**
 * Fetch and simplify top markets by volume
 */
export async function fetchTopMarkets(limit: number = TOP_MARKETS_COUNT): Promise<SimplifiedMarket[]> {
  const markets = await fetchMarkets(limit);
  return markets.map(simplifyMarket);
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

