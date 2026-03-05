import { TOP_MARKETS_COUNT } from '../constants';
import { fetchEvents, fetchMarketById, fetchMarkets } from './api';
import { checkResolution } from './resolution';
import { simplifyMarket } from './transformers';
import type { MarketResolution, PolymarketMarket, SimplifiedMarket } from './types';

export async function fetchMarketsFromEvents(limit: number = 100): Promise<PolymarketMarket[]> {
  const events = await fetchEvents(limit);
  const allMarkets: PolymarketMarket[] = [];

  for (const event of events) {
    if (!event.markets || !Array.isArray(event.markets)) {
      continue;
    }

    for (const market of event.markets) {
      const volumeNum = parseFloat(String(market.volumeNum || market.volume || 0));
      if (market.active === true && !market.closed && volumeNum > 0) {
        allMarkets.push(market);
      }
    }
  }

  console.log(`Extracted ${allMarkets.length} active markets from ${events.length} events`);
  return allMarkets;
}

export async function fetchTopMarkets(limit: number = TOP_MARKETS_COUNT): Promise<SimplifiedMarket[]> {
  const [directMarkets, eventMarkets] = await Promise.all([
    fetchMarkets(limit),
    fetchMarketsFromEvents(Math.max(50, limit))
  ]);

  const seen = new Set<string>();
  const allMarkets: PolymarketMarket[] = [];

  for (const market of [...directMarkets, ...eventMarkets]) {
    const id = market.id || market.conditionId || '';
    if (id && !seen.has(id)) {
      seen.add(id);
      allMarkets.push(market);
    }
  }

  allMarkets.sort((a, b) => {
    const volumeA = a.volumeNum ?? (a.volume ? parseFloat(String(a.volume)) : 0);
    const volumeB = b.volumeNum ?? (b.volume ? parseFloat(String(b.volume)) : 0);
    return volumeB - volumeA;
  });

  return allMarkets.slice(0, limit).map(simplifyMarket);
}

export async function checkMultipleResolutions(
  polymarketIds: string[]
): Promise<Map<string, MarketResolution>> {
  const results = new Map<string, MarketResolution>();
  const batchSize = 10;

  for (let i = 0; i < polymarketIds.length; i += batchSize) {
    const batch = polymarketIds.slice(i, i + batchSize);

    await Promise.all(batch.map(async (id) => {
      try {
        const market = await fetchMarketById(id);
        if (market) {
          results.set(id, checkResolution(market));
        }
      } catch (error) {
        console.error(`Error checking resolution for ${id}:`, error);
      }
    }));

    if (i + batchSize < polymarketIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
