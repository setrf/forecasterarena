import { fail, toErrorMessage } from '@/lib/engine/execution/shared';
import type { ExecResult } from '@/lib/engine/execution/types';
import type { Market } from '@/lib/types';

export function resolveBetPriceAndSideOrError(
  market: Market,
  requestedSide: string
): ExecResult<{ sideForStorage: string; price: number }> {
  if (market.market_type === 'binary') {
    const normalizedSide = requestedSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(`Invalid side "${requestedSide}" for binary market (must be YES or NO)`);
    }

    const yesPrice = market.current_price ?? 0.5;
    const price = normalizedSide === 'YES' ? yesPrice : (1 - yesPrice);

    if (!Number.isFinite(price) || price <= 0 || price > 1) {
      return fail(`Invalid executable price ${price} for side "${normalizedSide}"`);
    }

    return {
      ok: true,
      value: {
        sideForStorage: normalizedSide,
        price
      }
    };
  }

  try {
    const prices = JSON.parse(market.current_prices || '{}') as Record<string, unknown>;
    const outcomePrice = prices[requestedSide];

    if (outcomePrice === undefined || outcomePrice === null) {
      return fail(`No price available for outcome "${requestedSide}" in multi-outcome market`);
    }

    const price = parseFloat(String(outcomePrice));
    if (isNaN(price) || price <= 0 || price > 1) {
      return fail(`Invalid price ${outcomePrice} for outcome "${requestedSide}"`);
    }

    return {
      ok: true,
      value: {
        sideForStorage: requestedSide,
        price
      }
    };
  } catch (error) {
    return fail(`Failed to parse multi-outcome prices: ${toErrorMessage(error)}`);
  }
}
