import { getMarketById, getPositionById } from '@/lib/db/queries';
import { getExecutionPriceKey, type ExecutionPriceOverrides } from '@/lib/engine/execution/types';
import {
  getValidatedMarketPrices,
  getValidatedSidePrice
} from '@/lib/pricing/marketPrices';
import type { ParsedDecision } from '@/lib/openrouter/parser';
import type { Market } from '@/lib/types';

export async function prepareExecutionPriceOverrides(
  parsed: ParsedDecision
): Promise<ExecutionPriceOverrides | undefined> {
  if (parsed.action !== 'BET' && parsed.action !== 'SELL') {
    return undefined;
  }

  const marketsById = new Map<string, Market>();
  const requestedSides: Array<{ marketId: string; side: string }> = [];

  if (parsed.action === 'BET') {
    for (const bet of parsed.bets ?? []) {
      const market = getMarketById(bet.market_id);
      if (!market) {
        continue;
      }

      marketsById.set(market.id, market);
      requestedSides.push({
        marketId: market.id,
        side: market.market_type === 'binary' ? bet.side.toUpperCase() : bet.side
      });
    }
  }

  if (parsed.action === 'SELL') {
    for (const sell of parsed.sells ?? []) {
      const position = getPositionById(sell.position_id);
      if (!position) {
        continue;
      }

      const market = getMarketById(position.market_id);
      if (!market) {
        continue;
      }

      marketsById.set(market.id, market);
      requestedSides.push({ marketId: market.id, side: position.side });
    }
  }

  const validatedPrices = await getValidatedMarketPrices(Array.from(marketsById.values()));
  const overrides: ExecutionPriceOverrides = new Map();

  for (const request of requestedSides) {
    const market = marketsById.get(request.marketId);
    if (!market) {
      continue;
    }

    const price = getValidatedSidePrice({
      market,
      side: request.side,
      validatedPrice: validatedPrices.get(market.id)
    });

    overrides.set(
      getExecutionPriceKey(request.marketId, request.side),
      price ?? Number.NaN
    );
  }

  return overrides;
}
