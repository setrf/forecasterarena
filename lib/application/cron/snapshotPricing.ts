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
  'id' | 'market_type' | 'current_price' | 'current_prices'
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
