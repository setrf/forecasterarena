import { generateId, getDb } from '../index';
import type { Market } from '../../types';

export function getAllMarkets(limit: number = 1000): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

export function getActiveMarkets(limit: number = 500): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

export function getTopMarketsByVolume(limit: number): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'active'
    ORDER BY volume DESC NULLS LAST
    LIMIT ?
  `).all(limit) as Market[];
}

export function getMarketById(id: string): Market | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM markets WHERE id = ?').get(id) as Market | undefined;
}

export function getMarketByPolymarketId(polymarketId: string): Market | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM markets WHERE polymarket_id = ?').get(polymarketId) as Market | undefined;
}

export function upsertMarket(market: Partial<Market> & { polymarket_id: string }): Market {
  const db = getDb();
  const existing = getMarketByPolymarketId(market.polymarket_id);

  if (existing) {
    db.prepare(`
      UPDATE markets
      SET slug = COALESCE(?, slug),
          event_slug = COALESCE(?, event_slug),
          question = COALESCE(?, question),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          market_type = COALESCE(?, market_type),
          outcomes = COALESCE(?, outcomes),
          close_date = COALESCE(?, close_date),
          status = COALESCE(?, status),
          current_price = COALESCE(?, current_price),
          current_prices = COALESCE(?, current_prices),
          clob_token_ids = COALESCE(?, clob_token_ids),
          volume = COALESCE(?, volume),
          liquidity = COALESCE(?, liquidity),
          last_updated_at = CURRENT_TIMESTAMP
      WHERE polymarket_id = ?
    `).run(
      market.slug,
      market.event_slug,
      market.question,
      market.description,
      market.category,
      market.market_type,
      market.outcomes,
      market.close_date,
      market.status,
      market.current_price,
      market.current_prices,
      market.clob_token_ids,
      market.volume,
      market.liquidity,
      market.polymarket_id
    );

    return getMarketByPolymarketId(market.polymarket_id)!;
  }

  const id = generateId();

  db.prepare(`
    INSERT INTO markets (
      id, polymarket_id, slug, event_slug, question, description, category, market_type,
      outcomes, close_date, status, current_price, current_prices, clob_token_ids, volume, liquidity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    market.polymarket_id,
    market.slug,
    market.event_slug,
    market.question || '',
    market.description,
    market.category,
    market.market_type || 'binary',
    market.outcomes,
    market.close_date || new Date().toISOString(),
    market.status || 'active',
    market.current_price,
    market.current_prices,
    market.clob_token_ids,
    market.volume,
    market.liquidity
  );

  return getMarketById(id)!;
}

export function resolveMarket(id: string, outcome: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE markets
    SET status = 'resolved',
        resolution_outcome = ?,
        resolved_at = ?,
        last_updated_at = ?
    WHERE id = ?
  `).run(outcome, now, now, id);
}

export function getClosedMarkets(): Market[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM markets
    WHERE status = 'closed'
       OR (status = 'resolved' AND resolution_outcome IS NULL)
    ORDER BY close_date DESC
  `).all() as Market[];
}
