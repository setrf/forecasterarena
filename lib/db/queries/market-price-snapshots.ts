import { getDb } from '@/lib/db/connection';
import { generateId } from '@/lib/db/ids';

export interface MarketPriceSnapshotInput {
  market_id: string;
  snapshot_timestamp: string;
  source: string;
  accepted_price?: number | null;
  accepted_prices?: string | null;
  gamma_price?: number | null;
  gamma_prices?: string | null;
  clob_token_ids?: string | null;
  validation_status: string;
  anomaly_reason?: string | null;
}

export function upsertMarketPriceSnapshot(input: MarketPriceSnapshotInput): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO market_price_snapshots (
      id, market_id, snapshot_timestamp, source, accepted_price, accepted_prices,
      gamma_price, gamma_prices, clob_token_ids, validation_status, anomaly_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(market_id, snapshot_timestamp) DO UPDATE SET
      source = excluded.source,
      accepted_price = excluded.accepted_price,
      accepted_prices = excluded.accepted_prices,
      gamma_price = excluded.gamma_price,
      gamma_prices = excluded.gamma_prices,
      clob_token_ids = excluded.clob_token_ids,
      validation_status = excluded.validation_status,
      anomaly_reason = excluded.anomaly_reason
  `).run(
    generateId(),
    input.market_id,
    input.snapshot_timestamp,
    input.source,
    input.accepted_price ?? null,
    input.accepted_prices ?? null,
    input.gamma_price ?? null,
    input.gamma_prices ?? null,
    input.clob_token_ids ?? null,
    input.validation_status,
    input.anomaly_reason ?? null
  );
}
