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
 */
export function simplifyMarket(market: PolymarketMarket): SimplifiedMarket {
  const isBinary = market.tokens.length === 2 && 
    market.tokens.some(t => t.outcome.toLowerCase() === 'yes') &&
    market.tokens.some(t => t.outcome.toLowerCase() === 'no');
  
  let currentPrice: number | null = null;
  let currentPrices: string | null = null;
  
  if (isBinary) {
    const yesToken = market.tokens.find(t => t.outcome.toLowerCase() === 'yes');
    currentPrice = yesToken ? parseFloat(yesToken.price) : null;
  } else {
    const prices: Record<string, number> = {};
    for (const token of market.tokens) {
      prices[token.outcome] = parseFloat(token.price);
    }
    currentPrices = JSON.stringify(prices);
  }
  
  let status: 'active' | 'closed' | 'resolved' = 'active';
  if (market.resolved) status = 'resolved';
  else if (market.closed) status = 'closed';
  
  const outcomes = !isBinary 
    ? JSON.stringify(market.tokens.map(t => t.outcome))
    : null;
  
  return {
    polymarket_id: market.id || market.conditionId || '',
    question: market.question,
    description: market.description || null,
    category: market.category || null,
    market_type: isBinary ? 'binary' : 'multi_outcome',
    outcomes,
    close_date: market.end_date_iso,
    status,
    current_price: currentPrice,
    current_prices: currentPrices,
    volume: market.volume ? parseFloat(market.volume) : null,
    liquidity: market.liquidity ? parseFloat(market.liquidity) : null,
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

