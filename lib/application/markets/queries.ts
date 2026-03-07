import { getDb } from '@/lib/db';
import type { ListMarketsInput, MarketSortOption } from '@/lib/application/markets/types';

type Db = ReturnType<typeof getDb>;
type SqlParam = string | number;

interface MarketsWhereClause {
  whereClause: string;
  params: SqlParam[];
}

function getMarketsOrderBy(sort: MarketSortOption): string {
  switch (sort) {
    case 'close_date':
      return 'close_date ASC';
    case 'created':
      return 'first_seen_at DESC';
    case 'volume':
    default:
      return 'volume DESC NULLS LAST';
  }
}

export function buildListMarketsWhereClause({
  status,
  category,
  search,
  withCohortBets
}: Pick<ListMarketsInput, 'status' | 'category' | 'search' | 'withCohortBets'>): MarketsWhereClause {
  const conditions: string[] = [];
  const params: SqlParam[] = [];

  if (status !== 'all') {
    conditions.push('m.status = ?');
    params.push(status);
  }

  if (category) {
    conditions.push('m.category = ?');
    params.push(category);
  }

  if (search) {
    conditions.push('m.question LIKE ?');
    params.push(`%${search}%`);
  }

  if (withCohortBets) {
    conditions.push(`EXISTS (
      SELECT 1 FROM positions p
      JOIN agents a ON p.agent_id = a.id
      JOIN cohorts c ON a.cohort_id = c.id
      WHERE p.market_id = m.id
        AND c.status = 'active'
        AND p.status = 'open'
    )`);
  }

  return {
    whereClause: conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '',
    params
  };
}

export function countListedMarkets(
  db: Db,
  whereClause: string,
  params: SqlParam[]
): number {
  return (db.prepare(`SELECT COUNT(*) as total FROM markets m ${whereClause}`)
    .get(...params) as { total: number }).total;
}

export function selectListedMarkets(
  db: Db,
  whereClause: string,
  params: SqlParam[],
  sort: MarketSortOption,
  limit: number,
  offset: number
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(DISTINCT p.agent_id) FROM positions p WHERE p.market_id = m.id AND p.status = 'open') as positions_count
    FROM markets m
    ${whereClause}
    ORDER BY ${getMarketsOrderBy(sort)}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;
}

export function selectMarketCategories(db: Db): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT category
    FROM markets
    WHERE category IS NOT NULL
    ORDER BY category
  `).all() as Array<{ category: string }>;

  return rows.map((row) => row.category);
}

export function selectMarketStats(db: Db): {
  total_markets: number;
  active_markets: number;
  markets_with_positions: number;
} {
  return db.prepare(`
    SELECT
      COUNT(*) as total_markets,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_markets,
      (SELECT COUNT(DISTINCT m.id)
       FROM markets m
       WHERE EXISTS (
         SELECT 1 FROM positions p
         WHERE p.market_id = m.id
           AND p.status = 'open'
       )
      ) as markets_with_positions
    FROM markets
  `).get() as {
    total_markets: number;
    active_markets: number;
    markets_with_positions: number;
  };
}

export function selectMarketPositions(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      p.*,
      a.id as agent_id,
      m.id as model_id,
      m.display_name as model_display_name,
      m.color as model_color,
      COALESCE(
        (
          SELECT decision_id FROM trades t
          WHERE t.position_id = p.id
            AND t.trade_type = 'BUY'
            AND t.decision_id IS NOT NULL
          ORDER BY t.executed_at ASC
          LIMIT 1
        ),
        (
          SELECT decision_id FROM trades t
          WHERE t.agent_id = p.agent_id
            AND t.market_id = p.market_id
            AND t.side = p.side
            AND t.trade_type = 'BUY'
            AND t.decision_id IS NOT NULL
          ORDER BY t.executed_at ASC
          LIMIT 1
        )
      ) as decision_id
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE p.market_id = ? AND p.status = 'open'
    ORDER BY p.total_cost DESC
  `).all(marketId) as Array<Record<string, unknown>>;
}

export function selectMarketTrades(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      t.*,
      m.display_name as model_display_name,
      m.color as model_color
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE t.market_id = ?
    ORDER BY t.executed_at DESC
    LIMIT 100
  `).all(marketId) as Array<Record<string, unknown>>;
}

export function selectMarketBrierScores(
  db: Db,
  marketId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      bs.*,
      m.display_name as model_display_name,
      m.color as model_color
    FROM brier_scores bs
    JOIN agents a ON bs.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE bs.market_id = ?
    ORDER BY bs.brier_score ASC
  `).all(marketId) as Array<Record<string, unknown>>;
}
