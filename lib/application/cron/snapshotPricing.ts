import type { Market, Position } from '@/lib/types';
import {
  getValidatedSidePrice,
  type ValidatedMarketPrice
} from '@/lib/pricing/marketPrices';

type SnapshotPosition = Pick<Position, 'id' | 'side' | 'shares' | 'current_value'> & {
  avg_entry_price?: number;
};
type SnapshotMarket = Pick<
  Market,
  'id' | 'market_type' | 'status' | 'current_price' | 'current_prices' | 'resolution_outcome'
>;
type Warn = (message: string) => void;

export function fallbackYesPriceFromPosition(position: SnapshotPosition): number | null {
  if (
    position.shares <= 0 ||
    position.current_value === null ||
    position.current_value === undefined
  ) {
    return null;
  }

  const valuePerShare = position.current_value / position.shares;
  if (!Number.isFinite(valuePerShare)) {
    return null;
  }

  const side = position.side.toUpperCase();
  const impliedYesPrice = side === 'NO' ? 1 - valuePerShare : valuePerShare;
  return Math.min(Math.max(impliedYesPrice, 0), 1);
}

function parseOutcomePrice(
  position: SnapshotPosition,
  market: SnapshotMarket,
  warn: Warn
): number | null {
  try {
    const prices = JSON.parse(market.current_prices || '{}') as Record<string, unknown>;
    const outcomePrice = prices[position.side];

    if (outcomePrice === undefined || outcomePrice === null) {
      const fallbackPrice = fallbackYesPriceFromPosition(position);
      if (fallbackPrice === null) {
        warn(
          `[Snapshot] No price for outcome "${position.side}" in market ${market.id}; keeping prior value`
        );
        return null;
      }

      warn(
        `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for outcome "${position.side}" in market ${market.id}`
      );
      return fallbackPrice;
    }

    const parsedPrice = parseFloat(String(outcomePrice));
    if (Number.isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1) {
      const fallbackPrice = fallbackYesPriceFromPosition(position);
      if (fallbackPrice === null) {
        warn(
          `[Snapshot] Invalid price ${outcomePrice} for "${position.side}" in market ${market.id}; keeping prior value`
        );
        return null;
      }

      warn(
        `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for invalid outcome price in market ${market.id}`
      );
      return fallbackPrice;
    }

    return parsedPrice;
  } catch {
    warn(`[Snapshot] Failed to parse prices for market ${market.id}; keeping prior value`);
    return null;
  }
}

export function resolveSnapshotYesPrice(
  position: SnapshotPosition,
  market: SnapshotMarket,
  warn: Warn = console.warn
): number {
  let currentPrice: number | null = null;

  if (market.market_type === 'binary') {
    if (typeof market.current_price === 'number' && !Number.isNaN(market.current_price)) {
      currentPrice = market.current_price;
    } else {
      const fallbackPrice = fallbackYesPriceFromPosition(position);
      if (fallbackPrice === null) {
        warn(
          `[Snapshot] Missing price for market ${market.id}; keeping prior value for position ${position.id}`
        );
      } else {
        currentPrice = fallbackPrice;
        warn(
          `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for market ${market.id} from prior value`
        );
      }
    }
  } else {
    currentPrice = parseOutcomePrice(position, market, warn);
  }

  const unresolvedClosed = market.status === 'closed' && !market.resolution_outcome;
  const normalizedSide = position.side.toUpperCase();
  const wouldZeroPosition =
    currentPrice !== null &&
    ((normalizedSide === 'YES' && currentPrice === 0) ||
      (normalizedSide === 'NO' && currentPrice === 1));

  if (unresolvedClosed && (currentPrice === null || wouldZeroPosition)) {
    const fallbackPrice = fallbackYesPriceFromPosition(position);
    if (fallbackPrice !== null) {
      currentPrice = fallbackPrice;
      warn(
        `[Snapshot] Using prior value fallback ${fallbackPrice.toFixed(4)} for closed-unresolved market ${market.id}`
      );
    }
  }

  if (currentPrice === null) {
    return fallbackYesPriceFromPosition(position) ?? 0.5;
  }

  return currentPrice;
}

export function resolveValidatedSnapshotYesPrice(
  position: SnapshotPosition,
  market: SnapshotMarket,
  validatedPrice?: ValidatedMarketPrice,
  warn: Warn = console.warn
): number {
  const sidePrice = getValidatedSidePrice({ market: market as Market, side: position.side, validatedPrice });

  if (sidePrice !== null) {
    const normalizedSide = position.side.toUpperCase();
    return normalizedSide === 'NO' && market.market_type === 'binary'
      ? 1 - sidePrice
      : sidePrice;
  }

  const fallbackPrice = fallbackYesPriceFromPosition(position);
  if (fallbackPrice !== null) {
    warn(
      `[Snapshot] Using prior value fallback ${fallbackPrice.toFixed(4)} for market ${market.id}`
    );
    return fallbackPrice;
  }

  warn(
    `[Snapshot] Using entry price fallback ${(position.avg_entry_price ?? 0.5).toFixed(4)} for market ${market.id}`
  );
  const normalizedSide = position.side.toUpperCase();
  return normalizedSide === 'NO' && market.market_type === 'binary'
    ? 1 - (position.avg_entry_price ?? 0.5)
    : position.avg_entry_price ?? 0.5;
}
