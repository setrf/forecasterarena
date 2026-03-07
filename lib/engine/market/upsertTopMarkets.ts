import { TOP_MARKETS_COUNT } from '@/lib/constants';
import { getMarketByPolymarketId, upsertMarket } from '@/lib/db/queries';
import { fetchTopMarkets } from '@/lib/polymarket/client';

export async function upsertTopMarkets(errors: string[]): Promise<{
  added: number;
  updated: number;
}> {
  let added = 0;
  let updated = 0;

  const markets = await fetchTopMarkets(TOP_MARKETS_COUNT);

  console.log(`Fetched ${markets.length} markets from Polymarket`);

  for (const market of markets) {
    try {
      const existing = getMarketByPolymarketId(market.polymarket_id);

      upsertMarket(market);

      if (existing) {
        updated++;
      } else {
        added++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${market.polymarket_id}: ${message}`);
    }
  }

  return { added, updated };
}
