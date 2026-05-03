import { logSystemEvent } from '@/lib/db';
import { upsertMarketPriceSnapshot } from '@/lib/db/queries/market-price-snapshots';
import type { ValidatedMarketPrice } from '@/lib/pricing/marketPrices';
import type { Market } from '@/lib/types';

export function recordMarketPriceSnapshot(
  market: Market,
  snapshotTimestamp: string,
  validatedPrice: ValidatedMarketPrice | undefined
): void {
  upsertMarketPriceSnapshot({
    market_id: market.id,
    snapshot_timestamp: snapshotTimestamp,
    source: validatedPrice?.source ?? 'fallback',
    accepted_price: validatedPrice?.source === 'clob' ? validatedPrice.yesPrice ?? null : null,
    accepted_prices: validatedPrice?.source === 'clob' && validatedPrice.outcomePrices
      ? JSON.stringify(validatedPrice.outcomePrices)
      : null,
    gamma_price: market.current_price,
    gamma_prices: market.current_prices,
    clob_token_ids: validatedPrice?.clobTokenIds ?? market.clob_token_ids,
    validation_status: validatedPrice?.validationStatus ?? 'fallback',
    anomaly_reason: validatedPrice?.anomalyReason ?? null
  });

  if (validatedPrice?.anomalyReason) {
    logSystemEvent('price_validation_anomaly', {
      market_id: market.id,
      polymarket_id: market.polymarket_id,
      snapshot_timestamp: snapshotTimestamp,
      source: validatedPrice.source,
      status: validatedPrice.validationStatus,
      reason: validatedPrice.anomalyReason
    }, validatedPrice.source === 'fallback' ? 'warning' : 'info');
  }
}

export function recordMarketPriceSnapshots(
  markets: Market[],
  snapshotTimestamp: string,
  marketPrices: Map<string, ValidatedMarketPrice>
): void {
  for (const market of markets) {
    recordMarketPriceSnapshot(market, snapshotTimestamp, marketPrices.get(market.id));
  }
}
