import { fail, toErrorMessage } from '@/lib/engine/execution/shared';
import type { ExecResult } from '@/lib/engine/execution/types';
import type { Market } from '@/lib/types';

export function resolveSellCurrentPriceOrError(
  market: Market,
  positionSide: string
): ExecResult<{ currentPrice: number }> {
  if (market.market_type === 'binary') {
    const normalizedSide = positionSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(`Invalid side "${positionSide}" for binary market position`);
    }

    if (market.current_price === null || market.current_price === undefined) {
      return fail(`No current price available for binary market side "${normalizedSide}"`);
    }

    const yesPrice = market.current_price;
    const currentPrice = normalizedSide === 'YES' ? yesPrice : (1 - yesPrice);

    if (!Number.isFinite(currentPrice) || currentPrice < 0 || currentPrice > 1) {
      return fail(`Invalid current price ${currentPrice} for side "${normalizedSide}"`);
    }

    return { ok: true, value: { currentPrice } };
  }

  try {
    const prices = JSON.parse(market.current_prices || '{}') as Record<string, unknown>;
    const outcomePrice = prices[positionSide];

    if (outcomePrice === undefined || outcomePrice === null) {
      return fail(`No current price available for outcome "${positionSide}"`);
    }

    const currentPrice = parseFloat(String(outcomePrice));
    if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
      return fail(`Invalid current price ${outcomePrice} for outcome "${positionSide}"`);
    }

    return { ok: true, value: { currentPrice } };
  } catch (error) {
    return fail(`Failed to parse multi-outcome prices: ${toErrorMessage(error)}`);
  }
}
